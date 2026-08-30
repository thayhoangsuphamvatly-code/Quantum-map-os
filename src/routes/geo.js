// src/routes/geo.js
// Proxy toi cac dich vu ban do / thoi tiet / du lieu OSM MIEN PHI, khong can API key:
//  - Nominatim (tim kiem / geocode nguoc)
//  - OSRM cong khai (tim duong: oto, xe may xap xi, xe dap, di bo)
//  - Open-Meteo (thoi tiet hien tai) - khong can dang ky
//  - Overpass API (POI lan can, den giao thong, canh bao tuyen duong) - du lieu OpenStreetMap that
//  - Wikimedia Commons (anh minh hoa dia diem) - anh that, khong bia
//
// LUU Y TRUNG THUC: du lieu "khu vuc tac duong / canh bao do" la UOC TINH dua
// tren khung gio cao diem (khong phai cam bien giao thong thoi gian thuc, vi
// dich vu do can API tra phi). Frontend luon hien ro chu "uoc tinh".
const express = require("express");
const router = express.Router();
const { authenticate, requirePermission, requirePro } = require("../middleware");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OVERPASS_BASE = "https://overpass-api.de/api/interpreter";
const APP_USER_AGENT = "QuantumMapOS/1.0 (ung dung hoc tap, lien he qua admin)";

// Cau hinh may chu dinh tuyen mien phi cho tung phuong tien.
// "motorbike" dung tam profile "driving" vi khong co may chu OSRM mien phi
// rieng cho xe may cong khai - ket qua se xap xi tuyen duong o to.
const ROUTE_PROFILES = {
  driving:   { base: "https://router.project-osrm.org", profile: "driving", supportsAlt: true },
  motorbike: { base: "https://router.project-osrm.org", profile: "driving", supportsAlt: true },
  cycling:   { base: "https://routing.openstreetmap.de/routed-bike", profile: "bike", supportsAlt: false },
  walking:   { base: "https://routing.openstreetmap.de/routed-foot", profile: "foot", supportsAlt: false }
};

router.use(authenticate);

// ============================================================
// TIM KIEM DIA DIEM / GEOCODE NGUOC
// ============================================================

// Goi Nominatim mot lan voi cac tham so tuy chinh, tra ve mang ket qua da chuan hoa
async function callNominatim(params) {
  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
  const resp = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT, "Accept-Language": "vi" } });
  if (!resp.ok) throw new Error("Dich vu tim kiem dang gap su co");
  const data = await resp.json();
  return data.map(item => ({
    id: item.place_id,
    name: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
    boundingbox: item.boundingbox
  }));
}

// Nhan dien cau truy van dang "<so nha> <ten duong...>" (vi du "194 Lac Trung")
// de co the thu lai bang truong "street" chuyen dung cua Nominatim khi tim kiem
// tu do (free-form) khong ra ket qua - Nominatim lap chi muc so nha o Viet Nam
// khong day du nen can nhieu chien luoc thu lai.
const HOUSE_NUMBER_PATTERN = /^(\d+[a-zA-ZÀ-ỹ]{0,3})[\s,]+(.+)$/u;

router.get("/search", requirePermission("search"), async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "Vui long nhap tu khoa tim kiem" });

  // Uu tien ket qua gan vi tri nguoi dung dang xem tren ban do (bias mem, khong loai tru khu vuc khac)
  const nearLat = parseFloat(req.query.nearLat);
  const nearLng = parseFloat(req.query.nearLng);
  const hasBias = Number.isFinite(nearLat) && Number.isFinite(nearLng);

  function baseParams(query) {
    const p = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "8", q: query });
    if (hasBias) {
      const d = 0.25; // ~25km khung uu tien, khong gioi han cung (bounded=0)
      p.set("viewbox", `${nearLng - d},${nearLat + d},${nearLng + d},${nearLat - d}`);
      p.set("bounded", "0");
    }
    return p;
  }

  try {
    // Chien luoc 1: tim kiem tu do y nguyen nhu nguoi dung go
    let results = await callNominatim(baseParams(q));

    // Chien luoc 2: neu khong ra ket qua va cau truy van chua co "Viet Nam",
    // them ngu canh quoc gia - Nominatim doi khi can dieu nay de khop dia chi co so nha
    if (!results.length && !/viet\s*nam|vietnam/i.test(q)) {
      results = await callNominatim(baseParams(`${q}, Việt Nam`));
    }

    // Chien luoc 3: neu van khong co, va cau truy van dang "<so nha> <duong...>",
    // thu lai bang tim kiem co cau truc (structured search) voi truong "street"
    // chuyen dung cho so nha + ten duong - chinh xac hon doi voi dia chi VN
    if (!results.length) {
      const m = q.match(HOUSE_NUMBER_PATTERN);
      if (m) {
        const structured = new URLSearchParams({
          format: "jsonv2", addressdetails: "1", limit: "8",
          street: q, country: "Việt Nam"
        });
        if (hasBias) {
          const d = 0.25;
          structured.set("viewbox", `${nearLng - d},${nearLat + d},${nearLng + d},${nearLat - d}`);
          structured.set("bounded", "0");
        }
        results = await callNominatim(structured);
      }
    }

    // Chien luoc 4: van khong co ket qua va co so nha - thu tim rieng TEN DUONG
    // (bo so nha) de it nhat dua nguoi dung den dung con duong, kem ghi chu ro
    // rang chi tim thay ten duong chu khong chinh xac so nha
    let approximate = false;
    if (!results.length) {
      const m = q.match(HOUSE_NUMBER_PATTERN);
      if (m) {
        const streetOnly = m[2];
        results = await callNominatim(baseParams(hasBias ? streetOnly : `${streetOnly}, Việt Nam`));
        if (results.length) approximate = true;
      }
    }

    res.json({ results, approximate });
  } catch (e) {
    res.status(502).json({ error: "Khong the ket noi dich vu tim kiem dia diem: " + e.message });
  }
});

router.get("/reverse", requirePermission("search"), async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thieu toa do" });
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const resp = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT, "Accept-Language": "vi" } });
    if (!resp.ok) throw new Error("Dich vu dinh vi dang gap su co");
    const data = await resp.json();
    res.json({ address: data.display_name || `${lat}, ${lng}` });
  } catch (e) {
    res.status(502).json({ error: "Khong the xac dinh dia chi: " + e.message });
  }
});

// ============================================================
// THOI TIET HIEN TAI (Open-Meteo - mien phi, khong can API key)
// ============================================================

const WEATHER_CODE_MAP = {
  0: { desc: "Trời quang", icon: "☀️" },
  1: { desc: "Ít mây", icon: "🌤️" },
  2: { desc: "Có mây", icon: "⛅" },
  3: { desc: "Nhiều mây", icon: "☁️" },
  45: { desc: "Sương mù", icon: "🌫️" },
  48: { desc: "Sương mù đóng băng", icon: "🌫️" },
  51: { desc: "Mưa phùn nhẹ", icon: "🌦️" },
  53: { desc: "Mưa phùn", icon: "🌦️" },
  55: { desc: "Mưa phùn dày", icon: "🌧️" },
  56: { desc: "Mưa phùn đóng băng", icon: "🌧️" },
  57: { desc: "Mưa phùn đóng băng dày", icon: "🌧️" },
  61: { desc: "Mưa nhỏ", icon: "🌧️" },
  63: { desc: "Mưa vừa", icon: "🌧️" },
  65: { desc: "Mưa to", icon: "🌧️" },
  66: { desc: "Mưa đóng băng", icon: "🌧️" },
  67: { desc: "Mưa đóng băng nặng", icon: "🌧️" },
  71: { desc: "Tuyết nhẹ", icon: "🌨️" },
  73: { desc: "Tuyết vừa", icon: "🌨️" },
  75: { desc: "Tuyết to", icon: "❄️" },
  77: { desc: "Hạt tuyết", icon: "❄️" },
  80: { desc: "Mưa rào nhẹ", icon: "🌦️" },
  81: { desc: "Mưa rào vừa", icon: "🌧️" },
  82: { desc: "Mưa rào lớn", icon: "⛈️" },
  85: { desc: "Mưa tuyết rào nhẹ", icon: "🌨️" },
  86: { desc: "Mưa tuyết rào lớn", icon: "🌨️" },
  95: { desc: "Dông", icon: "⛈️" },
  96: { desc: "Dông kèm mưa đá nhẹ", icon: "⛈️" },
  99: { desc: "Dông kèm mưa đá lớn", icon: "⛈️" }
};

router.get("/weather", requirePermission("search"), async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thieu toa do" });
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Dich vu thoi tiet dang gap su co");
    const data = await resp.json();
    const cur = data.current || {};
    const info = WEATHER_CODE_MAP[cur.weather_code] || { desc: "Không rõ", icon: "🌡️" };
    res.json({
      tempC: cur.temperature_2m,
      isDay: cur.is_day === 1,
      description: info.desc,
      icon: info.icon,
      time: cur.time
    });
  } catch (e) {
    res.status(502).json({ error: "Không thể lấy dữ liệu thời tiết: " + e.message });
  }
});

// ============================================================
// ANH MINH HOA DIA DIEM (Wikimedia Commons - anh that, mien phi)
// ============================================================

router.get("/photos", requirePermission("search"), async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.json({ photos: [] });
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
    const resp = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
    if (!resp.ok) throw new Error("Loi dich vu anh");
    const data = await resp.json();
    const pages = (data.query && data.query.pages) || {};
    const photos = Object.values(pages)
      .map(p => {
        const info = p.imageinfo && p.imageinfo[0];
        if (!info) return null;
        const url = info.thumburl || info.url;
        if (!/\.(jpg|jpeg|png)(\?|$)/i.test(url)) return null;
        return { title: (p.title || "").replace(/^File:/, ""), url };
      })
      .filter(Boolean)
      .slice(0, 6);
    res.json({ photos });
  } catch (e) {
    // Anh chi la phan bo sung giao dien - loi thi tra ve mang rong, khong lam hong ca trang
    res.json({ photos: [] });
  }
});

// ============================================================
// DIA DIEM LAN CAN THEO DANH MUC (Overpass API - du lieu OSM that)
// ============================================================

const NEARBY_CATEGORY_TAGS = {
  hotel: '["tourism"="hotel"]',
  restaurant: '["amenity"="restaurant"]',
  cafe: '["amenity"="cafe"]',
  gas_station: '["amenity"="fuel"]',
  pharmacy: '["amenity"="pharmacy"]',
  atm: '["amenity"="atm"]',
  hospital: '["amenity"="hospital"]',
  parking: '["amenity"="parking"]'
};

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

router.get("/nearby", requirePermission("search"), async (req, res) => {
  const { lat, lng, category } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thieu toa do" });
  const tagFilter = NEARBY_CATEGORY_TAGS[category] || NEARBY_CATEGORY_TAGS.hotel;
  const radius = 1800;
  const query = `[out:json][timeout:15];(node${tagFilter}(around:${radius},${lat},${lng});way${tagFilter}(around:${radius},${lat},${lng}););out center 10;`;
  try {
    const resp = await fetch(OVERPASS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!resp.ok) throw new Error("Dich vu du lieu ban do dang qua tai, vui long thu lai sau");
    const data = await resp.json();
    const places = (data.elements || [])
      .map(el => {
        const plat = el.lat || (el.center && el.center.lat);
        const plng = el.lon || (el.center && el.center.lon);
        if (!plat || !plng || !el.tags || !el.tags.name) return null;
        return {
          name: el.tags.name,
          lat: plat,
          lng: plng,
          distanceMeters: Math.round(haversineMeters(Number(lat), Number(lng), plat, plng)),
          address: [el.tags["addr:street"], el.tags["addr:housenumber"]].filter(Boolean).join(" ")
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 8);
    res.json({ places });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ============================================================
// DEN GIAO THONG / CANH BAO TREN TUYEN (chi PRO & ADMIN) - Overpass API
// ============================================================

router.get("/signals", requirePro, async (req, res) => {
  const { south, west, north, east } = req.query;
  if (!south || !west || !north || !east) return res.status(400).json({ error: "Thieu khung toa do (bbox)" });
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:15];(node["highway"="traffic_signals"](${bbox});way["highway"="construction"](${bbox});node["hazard"](${bbox}););out center 60;`;
  try {
    const resp = await fetch(OVERPASS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!resp.ok) throw new Error("Dich vu du lieu ban do dang qua tai");
    const data = await resp.json();
    const signals = [];
    const hazards = [];
    (data.elements || []).forEach(el => {
      const plat = el.lat || (el.center && el.center.lat);
      const plng = el.lon || (el.center && el.center.lon);
      if (!plat || !plng) return;
      if (el.tags && el.tags.highway === "traffic_signals") {
        signals.push({ lat: plat, lng: plng });
      } else {
        hazards.push({
          lat: plat, lng: plng,
          label: (el.tags && (el.tags.hazard || (el.tags.highway === "construction" ? "Đang thi công" : "Cảnh báo"))) || "Cảnh báo"
        });
      }
    });
    res.json({ signals: signals.slice(0, 60), hazards: hazards.slice(0, 30) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ============================================================
// TIM DUONG (nhieu phuong tien; PRO co nhieu lua chon tuyen + uoc tinh dong duc)
// ============================================================

function estimateCongestion(distanceMeters, localHour) {
  const hour = Number.isInteger(localHour) ? localHour : new Date().getHours();
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const isShoulder = (hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 17) || (hour >= 19 && hour <= 20);
  let level = "low";
  if (isRush && distanceMeters > 1500) level = "high";
  else if (isRush || (isShoulder && distanceMeters > 3000)) level = "medium";
  return {
    level,
    hourUsed: hour,
    isEstimate: true,
    note: "Đây là ƯỚC TÍNH dựa trên khung giờ cao điểm, không phải dữ liệu cảm biến giao thông thời gian thực."
  };
}

router.get("/route", requirePermission("route"), async (req, res) => {
  const { fromLat, fromLng, toLat, toLng, mode, prefer, localHour } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: "Thieu toa do diem di / diem den" });
  }
  const config = ROUTE_PROFILES[mode] || ROUTE_PROFILES.driving;
  const userIsPro = req.user.role === "ADMIN" || req.user.tier === "PRO";
  const wantAlternatives = userIsPro && config.supportsAlt;

  try {
    const url = `${config.base}/route/v1/${config.profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=${wantAlternatives ? "true" : "false"}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Dich vu tim duong dang gap su co");
    const data = await resp.json();
    if (!data.routes || !data.routes.length) {
      return res.status(404).json({ error: "Khong tim thay duong di phu hop" });
    }

    const routes = data.routes.map(r => ({
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      geometry: r.geometry,
      steps: (r.legs?.[0]?.steps || []).map(s => ({
        instruction: s.maneuver?.type,
        name: s.name,
        distance: s.distance,
        duration: s.duration
      }))
    }));

    // Sap xep: tuyen nhanh nhat (duration thap nhat) len dau
    const byFastest = [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds);
    const byShortest = [...routes].sort((a, b) => a.distanceMeters - b.distanceMeters);

    let chosen;
    if (prefer === "shortest" && userIsPro) chosen = byShortest[0];
    else chosen = byFastest[0];

    const responseBody = {
      distanceMeters: chosen.distanceMeters,
      durationSeconds: chosen.durationSeconds,
      geometry: chosen.geometry,
      steps: chosen.steps,
      mode: mode || "driving",
      isPro: userIsPro
    };

    if (userIsPro) {
      responseBody.congestion = estimateCongestion(chosen.distanceMeters, localHour ? Number(localHour) : undefined);
      responseBody.redAlert = responseBody.congestion.level === "high";
      if (wantAlternatives && routes.length > 1) {
        responseBody.alternatives = byFastest.slice(0, 3).map(r => ({
          distanceMeters: r.distanceMeters,
          durationSeconds: r.durationSeconds,
          geometry: r.geometry
        }));
      }
    }

    res.json(responseBody);
  } catch (e) {
    res.status(502).json({ error: "Khong the tinh toan duong di: " + e.message });
  }
});

// ============================================================
// GIOI THIEU KHU VUC (Wikipedia that + thong ke POI that tu OSM)
// ============================================================

const AREA_STAT_CATEGORIES = [
  { key: "school", label: "Trường học", icon: "🏫", match: t => ["school", "university", "kindergarten"].includes(t.amenity) },
  { key: "hospital", label: "Y tế", icon: "🏥", match: t => ["hospital", "clinic"].includes(t.amenity) },
  { key: "food", label: "Ăn uống", icon: "🍜", match: t => ["restaurant", "cafe", "fast_food"].includes(t.amenity) },
  { key: "market", label: "Chợ / Siêu thị", icon: "🛒", match: t => t.shop === "supermarket" || t.shop === "convenience" || t.amenity === "marketplace" },
  { key: "bank", label: "Ngân hàng / ATM", icon: "🏧", match: t => ["bank", "atm"].includes(t.amenity) },
  { key: "pharmacy", label: "Nhà thuốc", icon: "💊", match: t => t.amenity === "pharmacy" },
  { key: "park", label: "Công viên", icon: "🌳", match: t => t.leisure === "park" }
];

router.get("/area-info", requirePermission("search"), async (req, res) => {
  const { lat, lng, query } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thieu toa do" });

  const result = { wiki: null, stats: [], radiusMeters: 1500 };

  // 1) Gioi thieu tu Wikipedia tieng Viet (that, co dan nguon) - chi ap dung
  // tot cho ten dia danh/khu vuc (thanh pho, tinh, phuong...), khong phai
  // moi dia chi cu the deu co bai viet rieng.
  if (query) {
    try {
      const searchUrl = `https://vi.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
      const searchResp = await fetch(searchUrl, { headers: { "User-Agent": APP_USER_AGENT } });
      const searchData = await searchResp.json();
      const title = searchData[1] && searchData[1][0];
      if (title) {
        const sumResp = await fetch(`https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
          headers: { "User-Agent": APP_USER_AGENT }
        });
        if (sumResp.ok) {
          const sumData = await sumResp.json();
          if (sumData.extract && sumData.type !== "disambiguation") {
            result.wiki = {
              title: sumData.title,
              extract: sumData.extract,
              url: (sumData.content_urls && sumData.content_urls.desktop && sumData.content_urls.desktop.page) || null
            };
          }
        }
      }
    } catch (e) { /* gioi thieu Wikipedia chi la thong tin bo sung - im lang neu loi */ }
  }

  // 2) Thong ke tien ich xung quanh - du lieu OpenStreetMap that qua Overpass
  try {
    const radius = result.radiusMeters;
    const q = `[out:json][timeout:20];(node["amenity"~"school|university|kindergarten|hospital|clinic|restaurant|cafe|fast_food|marketplace|bank|atm|pharmacy"](around:${radius},${lat},${lng});node["shop"~"supermarket|convenience"](around:${radius},${lat},${lng});way["leisure"="park"](around:${radius},${lat},${lng}););out center 200;`;
    const resp = await fetch(OVERPASS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q)
    });
    if (resp.ok) {
      const data = await resp.json();
      const buckets = {};
      AREA_STAT_CATEGORIES.forEach(c => { buckets[c.key] = { count: 0, samples: [] }; });
      (data.elements || []).forEach(el => {
        const tags = el.tags || {};
        const cat = AREA_STAT_CATEGORIES.find(c => c.match(tags));
        if (!cat) return;
        buckets[cat.key].count++;
        if (tags.name && buckets[cat.key].samples.length < 3) buckets[cat.key].samples.push(tags.name);
      });
      result.stats = AREA_STAT_CATEGORIES
        .map(c => ({ key: c.key, label: c.label, icon: c.icon, count: buckets[c.key].count, samples: buckets[c.key].samples }))
        .filter(s => s.count > 0);
    }
  } catch (e) { /* thong ke chi la thong tin bo sung - im lang neu loi */ }

  res.json(result);
});

module.exports = router;
