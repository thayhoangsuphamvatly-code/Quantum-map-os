// src/routes/geo.js
// Proxy toi cac dich vu ban do mien phi cua OpenStreetMap de tranh loi CORS
// va giau chi tiet ha tang khoi frontend. Yeu cau Node.js >= 18 (co fetch san).
const express = require("express");
const router = express.Router();
const { authenticate, requirePermission } = require("../middleware");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const APP_USER_AGENT = "MapViet-Neon/1.0 (ung dung hoc tap, lien he qua admin)";

router.use(authenticate);

// Tim kiem dia diem theo ten / dia chi
router.get("/search", requirePermission("search"), async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "Vui long nhap tu khoa tim kiem" });
  try {
    const url = `${NOMINATIM_BASE}/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT, "Accept-Language": "vi" } });
    if (!resp.ok) throw new Error("Dich vu tim kiem dang gap su co");
    const data = await resp.json();
    const results = data.map(item => ({
      id: item.place_id,
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      boundingbox: item.boundingbox
    }));
    res.json({ results });
  } catch (e) {
    res.status(502).json({ error: "Khong the ket noi dich vu tim kiem dia diem: " + e.message });
  }
});

// Geocode nguoc: lay dia chi tu toa do (dung khi click ban do / dinh vi)
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

// Tim duong di ngan nhat: mode = driving | walking
router.get("/route", requirePermission("route"), async (req, res) => {
  const { fromLat, fromLng, toLat, toLng, mode } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: "Thieu toa do diem di / diem den" });
  }
  const profile = mode === "walking" ? "foot" : "driving";
  try {
    const url = `${OSRM_BASE}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Dich vu tim duong dang gap su co");
    const data = await resp.json();
    if (!data.routes || !data.routes.length) {
      return res.status(404).json({ error: "Khong tim thay duong di phu hop" });
    }
    const route = data.routes[0];
    res.json({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry, // GeoJSON LineString
      steps: (route.legs?.[0]?.steps || []).map(s => ({
        instruction: s.maneuver?.type,
        name: s.name,
        distance: s.distance,
        duration: s.duration
      }))
    });
  } catch (e) {
    res.status(502).json({ error: "Khong the tinh toan duong di: " + e.message });
  }
});

module.exports = router;
