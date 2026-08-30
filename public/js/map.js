// js/map.js
// Toan bo logic ban do: Leaflet, tim kiem, dinh vi, tim duong (nhieu phuong
// tien + tinh nang PRO), the chi tiet dia diem kieu Google Maps, yeu thich
// co phan loai, canh bao thoi tiet/den giao thong/khu vuc uoc tinh dong duc.

const MapModule = (() => {
  let map;
  let meMarker = null;
  let placeMarker = null;
  let routeFromMarker = null;
  let routeToMarker = null;
  let routeLine = null;
  let altLines = [];
  let signalLayerGroup = null;
  let favMarkers = {};
  let pinMode = null; // 'from' | 'to' | null
  let routeFromCoord = null;
  let routeToCoord = null;
  let currentMode = "driving";
  let currentPrefer = "fastest";
  let lastFavorites = [];
  let favFilter = "all";
  let currentPlace = null; // { name, lat, lng, address }
  let pendingFavorite = null; // cho modal chon danh muc
  let pendingFavoriteCategory = "other";
  let currentNearbyCategory = "hotel";
  let watchId = null;
  let navRerouteTimer = null;
  let lastRouteDestination = null;
  let weatherDebounceTimer = null;
  let businessMarkers = {};
  let businessDebounceTimer = null;
  let myBusinessListings = [];
  let pendingBusinessCoord = null;

  const pulseIcon = L.divIcon({ className: "", html: '<div class="neon-pulse-icon"></div>', iconSize: [18, 18] });
  const favIcon = L.divIcon({ className: "", html: '<div class="fav-marker-icon"></div>', iconSize: [16, 16] });
  const signalIcon = L.divIcon({ className: "", html: '<span class="signal-icon">🚦</span>', iconSize: [18, 18] });
  const hazardIcon = L.divIcon({ className: "", html: '<span class="hazard-icon">⚠️</span>', iconSize: [20, 20] });
  const businessIcon = L.divIcon({ className: "", html: '<div class="business-marker-icon">🏷️</div>', iconSize: [26, 26] });

  const BUSINESS_CATEGORY_ICON = {
    restaurant: "🍜", cafe: "☕", hotel: "🏨", shop: "🛍️", service: "🔧", other: "📍"
  };

  const FAV_CATEGORY_LABELS = {
    home: "🏠 Nhà", work: "🏢 Công ty", food: "🍔 Ăn uống",
    travel: "🧳 Du lịch", shopping: "🛍️ Mua sắm", other: "📍 Khác"
  };
  const NEARBY_CATEGORY_ICON = {
    hotel: "🏨", restaurant: "🍜", cafe: "☕", gas_station: "⛽", atm: "🏧", pharmacy: "💊"
  };

  function init() {
    map = L.map("map", { zoomControl: true, attributionControl: true }).setView([21.0278, 105.8342], 13); // Ha Noi mac dinh

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    signalLayerGroup = L.layerGroup().addTo(map);

    map.on("click", onMapClick);
    map.on("contextmenu", onMapRightClick);
    map.on("moveend", onMapMoveEnd);

    bindSearch();
    bindLocate();
    bindRoutePanel();
    bindPlacePanel();
    bindCategoryModal();
    bindQrModal();
    bindBusinessPanel();
    applyTierToRouteUI();
    handleDeepLinkFromUrl();

    // Thoi tiet ngay tai vi tri trung tam ban do khi vua tai xong
    onMapMoveEnd();
  }

  function invalidateSize() { if (map) map.invalidateSize(); }

  function hasPermission(key) {
    if (!AppState.user) return false;
    if (AppState.user.role === "ADMIN") return true;
    return !!(AppState.user.permissions && AppState.user.permissions[key]);
  }

  function isPro() {
    return !!AppState.user && (AppState.user.role === "ADMIN" || AppState.user.tier === "PRO");
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function formatDistance(m) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  }

  // ---------------- HIEN THI TINH NANG THEO HANG TAI KHOAN ----------------
  function applyTierToRouteUI() {
    const pro = isPro();
    // Luu y: dat display "none" ro rang khi khong phai PRO; khi la PRO, chi
    // hien prefRow ngay (luon dung), con congestionBanner/routeAlternatives
    // se duoc chinh hien/an boi renderCongestion()/renderAlternatives() sau
    // khi co ket qua tim duong - o day chi dam bao chung KHONG bi "ket dinh"
    // o trang thai an do quy tac CSS ".pro-only{display:none}" (dat display
    // rong "" se rot lai ve quy tac CSS do, nen phai dat gia tri cu the).
    document.getElementById("prefRow").style.display = pro ? "flex" : "none";
    if (!pro) {
      document.getElementById("congestionBanner").style.display = "none";
      document.getElementById("routeAlternatives").style.display = "none";
    }
  }

  // ---------------- TIM KIEM (goi y ngay khi go) ----------------
  function bindSearch() {
    const input = document.getElementById("searchInput");
    const btn = document.getElementById("searchBtn");
    const resultsBox = document.getElementById("searchResults");
    let debounceTimer = null;
    let lastResults = [];
    let highlightIndex = -1;

    async function doSearch() {
      const q = input.value.trim();
      if (q.length < 2) { resultsBox.style.display = "none"; return; }
      if (!hasPermission("search")) return showToast("Bạn không có quyền tìm kiếm", true);
      try {
        const data = await Api.get(`/api/geo/search?q=${encodeURIComponent(q)}`);
        lastResults = data.results || [];
        highlightIndex = -1;
        renderSearchResults(lastResults, q);
      } catch (e) {
        showToast(e.message, true);
      }
    }

    function renderSearchResults(results, q) {
      if (!results.length) {
        resultsBox.innerHTML = '<div class="search-result-item">Không tìm thấy kết quả phù hợp</div>';
        resultsBox.style.display = "block";
        return;
      }
      resultsBox.innerHTML = results.map((r, i) => {
        const parts = r.name.split(",");
        const head = parts[0];
        const rest = parts.slice(1).join(",");
        return `<div class="search-result-item" data-idx="${i}">
          <b>${escapeHtml(head)}</b>${escapeHtml(rest)}
        </div>`;
      }).join("");
      resultsBox.style.display = "block";
      [...resultsBox.children].forEach((el, i) => {
        el.addEventListener("click", () => selectResult(results[i]));
      });
    }

    function selectResult(r) {
      resultsBox.style.display = "none";
      input.value = r.name;
      openPlaceDetail({ name: r.name.split(",")[0], address: r.name, lat: r.lat, lng: r.lng });
    }

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 250); // goi y gan nhu tuc thi khi go
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!lastResults.length) return;
        highlightIndex = Math.min(highlightIndex + 1, lastResults.length - 1);
        updateHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!lastResults.length) return;
        highlightIndex = Math.max(highlightIndex - 1, 0);
        updateHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && lastResults[highlightIndex]) selectResult(lastResults[highlightIndex]);
        else doSearch();
      } else if (e.key === "Escape") {
        resultsBox.style.display = "none";
      }
    });
    function updateHighlight() {
      [...resultsBox.children].forEach((el, i) => {
        el.style.background = i === highlightIndex ? "rgba(34,211,238,0.14)" : "";
      });
    }
    btn.addEventListener("click", doSearch);
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) resultsBox.style.display = "none";
    });
  }

  // ---------------- DINH VI ----------------
  function bindLocate() {
    document.getElementById("btnLocate").addEventListener("click", () => {
      if (!hasPermission("locate")) return showToast("Bạn không có quyền định vị", true);
      if (!navigator.geolocation) return showToast("Trình duyệt không hỗ trợ định vị", true);
      showToast("Đang xác định vị trí của bạn...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (meMarker) map.removeLayer(meMarker);
          meMarker = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(map).bindPopup("Vị trí của bạn");
          map.flyTo([latitude, longitude], 15, { duration: 1 });
          routeFromCoord = { lat: latitude, lng: longitude };
          document.getElementById("routeFrom").value = "Vị trí hiện tại của tôi";
        },
        () => showToast("Không thể lấy vị trí. Vui lòng cấp quyền định vị cho trình duyệt.", true),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ---------------- THOI TIET THEO TRUNG TAM BAN DO ----------------
  async function onMapMoveEnd() {
    clearTimeout(weatherDebounceTimer);
    weatherDebounceTimer = setTimeout(async () => {
      if (!hasPermission("search")) return;
      const c = map.getCenter();
      try {
        const w = await Api.get(`/api/geo/weather?lat=${c.lat}&lng=${c.lng}`);
        const badge = document.getElementById("mapWeatherBadge");
        badge.innerHTML = `<span style="font-size:16px;">${w.icon}</span> <b style="color:var(--text-main);">${Math.round(w.tempC)}°C</b> · ${escapeHtml(w.description)}`;
        badge.style.display = "flex";
      } catch (e) { /* thoi tiet chi la thong tin bo sung - im lang neu loi */ }
    }, 900);

    clearTimeout(businessDebounceTimer);
    businessDebounceTimer = setTimeout(loadBusinessMarkersInView, 900);
  }

  async function loadBusinessMarkersInView() {
    if (!hasPermission("search")) return;
    const c = map.getCenter();
    const bounds = map.getBounds();
    const radius = Math.min(haversineMeters(c.lat, c.lng, bounds.getNorthEast().lat, bounds.getNorthEast().lng), 8000);
    try {
      const data = await Api.get(`/api/business/nearby?lat=${c.lat}&lng=${c.lng}&radius=${Math.round(radius)}`);
      const listings = data.listings || [];
      const seenIds = new Set(listings.map(l => l.id));
      Object.keys(businessMarkers).forEach(id => {
        if (!seenIds.has(Number(id))) { map.removeLayer(businessMarkers[id]); delete businessMarkers[id]; }
      });
      listings.forEach(l => {
        if (businessMarkers[l.id]) return;
        const m = L.marker([l.lat, l.lng], { icon: businessIcon }).addTo(map)
          .bindPopup(`<b>🏷️ ${escapeHtml(l.name)}</b><br/>Quảng cáo · ${escapeHtml(l.address || "")}`);
        m.on("click", () => openPlaceDetail({ name: l.name, lat: l.lat, lng: l.lng, address: l.address, isSponsored: true, sponsoredInfo: l }));
        businessMarkers[l.id] = m;
      });
    } catch (e) { /* lop quang cao la bo sung - im lang neu loi */ }
  }

  // ---------------- CLICK BAN DO ----------------
  async function onMapClick(e) {
    if (pinMode === "from" || pinMode === "to") {
      setRoutePoint(pinMode, e.latlng.lat, e.latlng.lng);
      pinMode = null;
      document.querySelectorAll(".pin").forEach(b => b.classList.remove("active"));
    } else if (pinMode === "business") {
      await setBusinessLocation(e.latlng.lat, e.latlng.lng);
      pinMode = null;
      document.querySelectorAll(".pin").forEach(b => b.classList.remove("active"));
    }
  }

  async function onMapRightClick(e) {
    e.originalEvent.preventDefault();
    const { lat, lng } = e.latlng;
    openPlaceDetail({ name: null, lat, lng });
  }

  // ---------------- THE CHI TIET DIA DIEM (kieu Google Maps) ----------------
  function bindPlacePanel() {
    document.getElementById("placeActionDirections").addEventListener("click", () => {
      if (!currentPlace) return;
      if (!hasPermission("route")) return showToast("Bạn không có quyền tìm đường", true);
      routeToCoord = { lat: currentPlace.lat, lng: currentPlace.lng };
      document.getElementById("routeTo").value = currentPlace.name || currentPlace.address || "";
      closePanel("placePanel");
      switchView("route");
    });

    document.getElementById("placeActionSave").addEventListener("click", () => {
      if (!currentPlace) return;
      if (!hasPermission("favorites")) return showToast("Bạn không có quyền lưu yêu thích", true);
      openCategoryModal(currentPlace);
    });

    document.getElementById("placeActionNearby").addEventListener("click", () => {
      const section = document.getElementById("nearbySection");
      section.style.display = section.style.display === "none" ? "block" : "none";
      if (section.style.display === "block") fetchNearby(currentNearbyCategory);
    });

    document.querySelectorAll(".nearby-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".nearby-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentNearbyCategory = tab.dataset.cat;
        fetchNearby(currentNearbyCategory);
      });
    });

    document.getElementById("placeActionSend").addEventListener("click", () => {
      if (!currentPlace) return;
      openQrModal(currentPlace);
    });

    document.getElementById("placeActionShare").addEventListener("click", async () => {
      if (!currentPlace) return;
      const link = buildShareLink(currentPlace);
      if (navigator.share) {
        try { await navigator.share({ title: currentPlace.name || "Địa điểm", url: link }); }
        catch (e) { /* nguoi dung huy chia se - khong can bao loi */ }
      } else {
        try {
          await navigator.clipboard.writeText(link);
          showToast("Đã sao chép liên kết chia sẻ 🔗");
        } catch (e) { showToast("Không thể sao chép liên kết", true); }
      }
    });
  }

  function buildShareLink(place) {
    const base = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({ lat: place.lat, lng: place.lng, name: place.name || "" });
    return `${base}?${params.toString()}`;
  }

  async function openPlaceDetail(place) {
    currentPlace = { name: place.name, address: place.address || null, lat: place.lat, lng: place.lng, isSponsored: !!place.isSponsored, sponsoredInfo: place.sponsoredInfo || null };

    closePanel("routePanel");
    closePanel("favPanel");
    document.getElementById("placePanel").classList.add("open");
    setTimeout(invalidateSize, 220);

    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 15), { duration: 1 });

    if (placeMarker) map.removeLayer(placeMarker);
    placeMarker = L.marker([place.lat, place.lng]).addTo(map);

    renderPlaceNameHeader(place.name || "Đang tải...");
    document.getElementById("placeAddress").textContent = place.address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;
    document.getElementById("placeWeather").style.display = "none";
    document.getElementById("nearbySection").style.display = "none";
    document.getElementById("photosSection").style.display = "none";
    document.getElementById("areaIntroSection").style.display = "none";
    document.getElementById("sponsoredSection").style.display = "none";
    document.getElementById("areaWikiExtract").style.display = "none";
    document.getElementById("areaWikiLink").style.display = "none";
    document.getElementById("areaStatsGrid").innerHTML = "";
    const hero = document.getElementById("placeHero");
    hero.className = "place-hero";
    hero.style.backgroundImage = "";
    hero.textContent = "🏞️";

    // Neu la dia diem quang cao, hien them mo ta/SDT doanh nghiep da khai bao
    if (place.isSponsored && place.sponsoredInfo) {
      const info = place.sponsoredInfo;
      const extra = [info.description, info.phone ? `☎ ${info.phone}` : null].filter(Boolean).join(" · ");
      if (extra) document.getElementById("placeAddress").textContent += (place.address ? " — " : "") + extra;
    }

    // Neu chua co dia chi/ten cu the -> geocode nguoc de lay dia chi
    if (!place.address && hasPermission("search")) {
      try {
        const data = await Api.get(`/api/geo/reverse?lat=${place.lat}&lng=${place.lng}`);
        currentPlace.address = data.address;
        if (!currentPlace.name) currentPlace.name = data.address.split(",")[0];
        renderPlaceNameHeader(currentPlace.name);
        document.getElementById("placeAddress").textContent = currentPlace.address;
      } catch (e) { /* giu toa do neu loi */ }
    }

    // Thoi tiet tai dia diem
    if (hasPermission("search")) {
      Api.get(`/api/geo/weather?lat=${place.lat}&lng=${place.lng}`).then(w => {
        const box = document.getElementById("placeWeather");
        box.innerHTML = `<span style="font-size:18px;">${w.icon}</span> <span class="pw-temp">${Math.round(w.tempC)}°C</span> · ${escapeHtml(w.description)}`;
        box.style.display = "inline-flex";
      }).catch(() => {});

      // Anh minh hoa that (Wikimedia Commons)
      const query = currentPlace.name || currentPlace.address;
      if (query) {
        Api.get(`/api/geo/photos?q=${encodeURIComponent(query)}`).then(data => {
          const photos = data.photos || [];
          if (photos.length) {
            hero.classList.add("has-img");
            hero.style.backgroundImage = `url('${photos[0].url}')`;
            hero.textContent = "";
            const grid = document.getElementById("placePhotos");
            grid.innerHTML = photos.map(p => `<img src="${p.url}" alt="${escapeHtml(p.title)}" loading="lazy" />`).join("");
            document.getElementById("photosSection").style.display = "block";
          }
        }).catch(() => {});
      }

      // Gioi thieu khu vuc (Wikipedia that + thong ke POI that)
      if (query) {
        Api.get(`/api/geo/area-info?lat=${place.lat}&lng=${place.lng}&query=${encodeURIComponent(query)}`).then(data => {
          renderAreaIntro(data);
        }).catch(() => {});
      }

      // Cac dia diem duoc quang cao gan day (luon gan nhan ro rang, khong tron voi ket qua tu nhien)
      Api.get(`/api/business/nearby?lat=${place.lat}&lng=${place.lng}&radius=3000`).then(data => {
        renderSponsoredNearby(data.listings || []);
      }).catch(() => {});
    }
  }

  function renderPlaceNameHeader(name) {
    const nameEl = document.getElementById("placeName");
    if (currentPlace && currentPlace.isSponsored) {
      nameEl.innerHTML = `<span class="sponsor-tag">🏷️ QUẢNG CÁO</span><br/>${escapeHtml(name || "")}`;
    } else {
      nameEl.textContent = name || "—";
    }
  }

  function renderAreaIntro(data) {
    const section = document.getElementById("areaIntroSection");
    const extractEl = document.getElementById("areaWikiExtract");
    const linkEl = document.getElementById("areaWikiLink");
    const statsGrid = document.getElementById("areaStatsGrid");

    let hasContent = false;

    if (data.wiki && data.wiki.extract) {
      extractEl.textContent = data.wiki.extract;
      extractEl.style.display = "block";
      if (data.wiki.url) {
        linkEl.href = data.wiki.url;
        linkEl.style.display = "inline-block";
      }
      hasContent = true;
    }

    if (data.stats && data.stats.length) {
      statsGrid.innerHTML = data.stats.map(s => `
        <div class="area-stat-chip" title="${s.samples.map(escapeHtml).join(', ')}">
          ${s.icon} <b>${s.count}</b> ${escapeHtml(s.label)}
        </div>
      `).join("");
      hasContent = true;
    }

    section.style.display = hasContent ? "block" : "none";
  }

  function renderSponsoredNearby(listings) {
    const section = document.getElementById("sponsoredSection");
    const carousel = document.getElementById("sponsoredCarousel");
    if (!listings.length) { section.style.display = "none"; return; }
    carousel.innerHTML = listings.map((l, i) => `
      <div class="nearby-card sponsored" data-idx="${i}">
        <span class="sponsor-tag">🏷️ Quảng cáo</span>
        <div class="nc-icon">${BUSINESS_CATEGORY_ICON[l.category] || "📍"}</div>
        <div class="nc-name">${escapeHtml(l.name)}</div>
        <div class="nc-dist">${formatDistance(l.distanceMeters)}</div>
      </div>
    `).join("");
    [...carousel.children].forEach((el, i) => {
      el.addEventListener("click", () => openPlaceDetail({
        name: listings[i].name, lat: listings[i].lat, lng: listings[i].lng,
        address: listings[i].address, isSponsored: true, sponsoredInfo: listings[i]
      }));
    });
    section.style.display = "block";
  }

  async function fetchNearby(category) {
    if (!currentPlace) return;
    const carousel = document.getElementById("nearbyCarousel");
    carousel.innerHTML = '<div class="hint-text">Đang tìm địa điểm gần đó...</div>';
    try {
      const data = await Api.get(`/api/geo/nearby?lat=${currentPlace.lat}&lng=${currentPlace.lng}&category=${category}`);
      const places = data.places || [];
      if (!places.length) {
        carousel.innerHTML = '<div class="hint-text">Không tìm thấy địa điểm phù hợp gần đây.</div>';
        return;
      }
      carousel.innerHTML = places.map((p, i) => `
        <div class="nearby-card" data-idx="${i}">
          <div class="nc-icon">${NEARBY_CATEGORY_ICON[category] || "📍"}</div>
          <div class="nc-name">${escapeHtml(p.name)}</div>
          <div class="nc-dist">${formatDistance(p.distanceMeters)}${p.address ? " · " + escapeHtml(p.address) : ""}</div>
        </div>
      `).join("");
      [...carousel.children].forEach((el, i) => {
        el.addEventListener("click", () => openPlaceDetail({ name: places[i].name, lat: places[i].lat, lng: places[i].lng }));
      });
    } catch (e) {
      carousel.innerHTML = `<div class="hint-text">${escapeHtml(e.message)}</div>`;
    }
  }

  // ---------------- QR "GUI TOI DIEN THOAI" ----------------
  function bindQrModal() {
    document.getElementById("btnCloseQrModal").addEventListener("click", () => closeModal("qrModal"));
    document.getElementById("qrModal").addEventListener("click", (e) => { if (e.target.id === "qrModal") closeModal("qrModal"); });
    document.getElementById("btnCopyShareLink").addEventListener("click", async () => {
      const link = document.getElementById("qrShareLink").value;
      try { await navigator.clipboard.writeText(link); showToast("Đã sao chép liên kết"); }
      catch (e) { showToast("Không thể sao chép liên kết", true); }
    });
  }

  function openQrModal(place) {
    const link = buildShareLink(place);
    document.getElementById("qrShareLink").value = link;
    const box = document.getElementById("qrCodeBox");
    box.innerHTML = "";
    if (window.QRCode) {
      new QRCode(box, { text: link, width: 176, height: 176, colorDark: "#07061a", colorLight: "#ffffff" });
    } else {
      box.innerHTML = '<div class="hint-text">Không tải được thư viện mã QR. Bạn có thể sao chép liên kết bên dưới.</div>';
    }
    document.getElementById("qrModal").classList.add("open");
  }

  // ---------------- MODAL CHON DANH MUC YEU THICH ----------------
  function bindCategoryModal() {
    document.querySelectorAll(".category-pick").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".category-pick").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        pendingFavoriteCategory = btn.dataset.cat;
      });
    });
    document.getElementById("btnCancelCategoryModal").addEventListener("click", () => closeModal("categoryModal"));
    document.getElementById("categoryModal").addEventListener("click", (e) => { if (e.target.id === "categoryModal") closeModal("categoryModal"); });
    document.getElementById("btnConfirmSaveFavorite").addEventListener("click", async () => {
      if (!pendingFavorite) return;
      try {
        await Api.post("/api/favorites", {
          name: pendingFavorite.name,
          lat: pendingFavorite.lat,
          lng: pendingFavorite.lng,
          address: pendingFavorite.address || "",
          category: pendingFavoriteCategory
        });
        showToast("Đã lưu vào yêu thích ⭐");
        closeModal("categoryModal");
        loadFavorites();
      } catch (e) { showToast(e.message, true); }
    });
  }

  function openCategoryModal(place) {
    pendingFavorite = place;
    pendingFavoriteCategory = "other";
    document.querySelectorAll(".category-pick").forEach(b => b.classList.toggle("active", b.dataset.cat === "other"));
    document.getElementById("categoryModalPlaceName").textContent = place.name || place.address || "Địa điểm đã chọn";
    document.getElementById("categoryModal").classList.add("open");
  }

  function closeModal(id) { document.getElementById(id).classList.remove("open"); }
  function closePanel(id) { document.getElementById(id).classList.remove("open"); }

  // ---------------- TIM DUONG ----------------
  function bindRoutePanel() {
    document.querySelectorAll("#modeSwitch .mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#modeSwitch .mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
        document.getElementById("motorbikeHint").style.display = currentMode === "motorbike" ? "block" : "none";
      });
    });

    document.querySelectorAll('#prefRow .mode-btn').forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll('#prefRow .mode-btn').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPrefer = btn.dataset.prefer;
      });
    });

    document.querySelectorAll(".pin").forEach(btn => {
      btn.addEventListener("click", () => {
        const which = btn.dataset.pin;
        pinMode = pinMode === which ? null : which;
        document.querySelectorAll(".pin").forEach(b => b.classList.remove("active"));
        if (pinMode) {
          btn.classList.add("active");
          showToast(`Nhấp vào bản đồ để chọn điểm ${which === "from" ? "đi" : "đến"}`);
        }
      });
    });

    document.getElementById("btnFindRoute").addEventListener("click", findRoute);
    document.getElementById("btnSwapRoute").addEventListener("click", swapRoutePoints);
    document.getElementById("btnStartNav").addEventListener("click", startNavigation);
    document.getElementById("btnStopNav").addEventListener("click", stopNavigation);
  }

  function swapRoutePoints() {
    const fromInput = document.getElementById("routeFrom");
    const toInput = document.getElementById("routeTo");

    const tmpText = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = tmpText;

    const tmpCoord = routeFromCoord;
    routeFromCoord = routeToCoord;
    routeToCoord = tmpCoord;

    const tmpMarker = routeFromMarker;
    if (routeToMarker) routeToMarker.setStyle({ color: "#34d399", fillColor: "#34d399" });
    if (tmpMarker) tmpMarker.setStyle({ color: "#ec4899", fillColor: "#ec4899" });
    routeFromMarker = routeToMarker;
    routeToMarker = tmpMarker;
  }

  async function setRoutePoint(which, lat, lng) {
    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const data = await Api.get(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      address = data.address;
    } catch (e) { /* fallback toa do */ }

    if (which === "from") {
      routeFromCoord = { lat, lng };
      document.getElementById("routeFrom").value = address;
      if (routeFromMarker) map.removeLayer(routeFromMarker);
      routeFromMarker = L.circleMarker([lat, lng], { radius: 7, color: "#34d399", fillColor: "#34d399", fillOpacity: 1 }).addTo(map);
    } else {
      routeToCoord = { lat, lng };
      document.getElementById("routeTo").value = address;
      if (routeToMarker) map.removeLayer(routeToMarker);
      routeToMarker = L.circleMarker([lat, lng], { radius: 7, color: "#ec4899", fillColor: "#ec4899", fillOpacity: 1 }).addTo(map);
    }
  }

  async function geocodeIfNeeded(coord, textInputId) {
    if (coord) return coord;
    const text = document.getElementById(textInputId).value.trim();
    if (!text) return null;
    const data = await Api.get(`/api/geo/search?q=${encodeURIComponent(text)}`);
    if (!data.results || !data.results.length) return null;
    return { lat: data.results[0].lat, lng: data.results[0].lng };
  }

  function clearAltLines() {
    altLines.forEach(l => map.removeLayer(l));
    altLines = [];
  }

  function clearSignals() {
    if (signalLayerGroup) signalLayerGroup.clearLayers();
  }

  async function findRoute() {
    if (!hasPermission("route")) return showToast("Bạn không có quyền tìm đường", true);
    try {
      const from = await geocodeIfNeeded(routeFromCoord, "routeFrom");
      const to = await geocodeIfNeeded(routeToCoord, "routeTo");
      if (!from || !to) return showToast("Vui lòng nhập hoặc chọn đầy đủ điểm đi và điểm đến", true);

      showToast("Đang tính toán đường đi...");
      const localHour = new Date().getHours();
      const preferParam = isPro() ? `&prefer=${currentPrefer}` : "";
      const data = await Api.get(
        `/api/geo/route?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}&mode=${currentMode}&localHour=${localHour}${preferParam}`
      );

      drawRoute(data);
      lastRouteDestination = to;

      document.getElementById("btnStartNav").style.display = "inline-flex";
      document.getElementById("btnStopNav").style.display = "none";
      document.getElementById("navStatus").style.display = "none";

      renderCongestion(data);
      renderAlternatives(data, from, to);

      if (isPro()) fetchSignalsAlongRoute(data.geometry);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function drawRoute(data) {
    if (routeLine) map.removeLayer(routeLine);
    clearAltLines();
    const latlngs = data.geometry.coordinates.map(c => [c[1], c[0]]);
    const modeColors = { driving: "#22d3ee", motorbike: "#fbbf24", cycling: "#34d399", walking: "#a855f7" };
    const color = modeColors[data.mode] || "#22d3ee";
    routeLine = L.polyline(latlngs, { color, weight: 5, opacity: 0.88 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    const km = (data.distanceMeters / 1000).toFixed(1);
    const mins = Math.round(data.durationSeconds / 60);
    const modeLabel = { driving: "Ô tô 🚗", motorbike: "Xe máy 🏍️", cycling: "Xe đạp 🚲", walking: "Đi bộ 🚶" }[data.mode] || "";
    document.getElementById("routeDistance").textContent = `${km} km`;
    document.getElementById("routeDuration").textContent = `Khoảng ${mins} phút · ${modeLabel}`;
    document.getElementById("routeSummary").classList.add("show");
  }

  function renderCongestion(data) {
    const banner = document.getElementById("congestionBanner");
    if (!isPro() || !data.congestion || data.congestion.level === "low") {
      banner.style.display = "none";
      return;
    }
    banner.classList.remove("level-medium");
    if (data.congestion.level === "medium") banner.classList.add("level-medium");
    document.getElementById("cbIcon").textContent = data.redAlert ? "🔴" : "⚠️";
    document.getElementById("cbTitle").textContent = data.redAlert
      ? "Cảnh báo đỏ: khu vực có thể ùn tắc nặng"
      : "Khu vực có thể hơi đông";
    banner.style.display = "block";
  }

  function renderAlternatives(data, from, to) {
    const box = document.getElementById("routeAlternatives");
    if (!isPro() || !data.alternatives || data.alternatives.length < 2) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    box.style.display = "flex";
    box.innerHTML = `<div class="place-section-title" style="margin-bottom:2px;">Các tuyến khác</div>` +
      data.alternatives.map((alt, i) => `
        <div class="route-alt-card ${i === 0 ? "selected" : ""}" data-idx="${i}">
          <span>Tuyến ${i + 1}</span>
          <span><b>${(alt.distanceMeters / 1000).toFixed(1)} km</b> · ${Math.round(alt.durationSeconds / 60)} phút</span>
        </div>
      `).join("");

    clearAltLines();
    data.alternatives.forEach((alt, i) => {
      if (i === 0) return; // tuyen dau da ve o drawRoute()
      const latlngs = alt.geometry.coordinates.map(c => [c[1], c[0]]);
      const line = L.polyline(latlngs, { color: "#6b7280", weight: 4, opacity: 0.55, dashArray: "6 8" }).addTo(map);
      altLines.push(line);
    });

    [...box.querySelectorAll(".route-alt-card")].forEach((el, i) => {
      el.addEventListener("click", () => {
        const alt = data.alternatives[i];
        box.querySelectorAll(".route-alt-card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        drawRoute({ ...alt, mode: data.mode });
      });
    });
  }

  async function fetchSignalsAlongRoute(geometry) {
    clearSignals();
    try {
      const coords = geometry.coordinates;
      let south = 90, north = -90, west = 180, east = -180;
      coords.forEach(c => {
        const lng = c[0], lat = c[1];
        if (lat < south) south = lat;
        if (lat > north) north = lat;
        if (lng < west) west = lng;
        if (lng > east) east = lng;
      });
      const pad = 0.01;
      const data = await Api.get(`/api/geo/signals?south=${south - pad}&west=${west - pad}&north=${north + pad}&east=${east + pad}`);
      (data.signals || []).forEach(s => {
        L.marker([s.lat, s.lng], { icon: signalIcon }).addTo(signalLayerGroup).bindPopup("Đèn giao thông");
      });
      (data.hazards || []).forEach(h => {
        L.marker([h.lat, h.lng], { icon: hazardIcon }).addTo(signalLayerGroup).bindPopup(escapeHtml(h.label));
      });
    } catch (e) { /* lop canh bao la bo sung - im lang neu loi */ }
  }

  // ---------------- DIEU HUONG LIEN TUC (Bat dau / Dung) ----------------
  function startNavigation() {
    if (!hasPermission("locate")) return showToast("Bạn không có quyền định vị để bắt đầu điều hướng", true);
    if (!lastRouteDestination) return showToast("Vui lòng tìm đường trước khi bắt đầu", true);
    if (!navigator.geolocation) return showToast("Trình duyệt không hỗ trợ định vị", true);

    document.getElementById("btnStartNav").style.display = "none";
    document.getElementById("btnStopNav").style.display = "inline-flex";
    const statusEl = document.getElementById("navStatus");
    statusEl.style.display = "block";
    statusEl.textContent = "Đang lấy vị trí của bạn...";

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (meMarker) map.removeLayer(meMarker);
        meMarker = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(map);
        map.panTo([latitude, longitude], { animate: true, duration: 0.5 });

        const remaining = haversineMeters(latitude, longitude, lastRouteDestination.lat, lastRouteDestination.lng);
        statusEl.textContent = `📡 Đang cập nhật vị trí trực tiếp · còn khoảng ${formatDistance(remaining)} theo đường chim bay`;
      },
      (err) => {
        showToast("Mất tín hiệu định vị: " + err.message, true);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );

    // Cap nhat lai tuyen duong dinh ky (khong goi lien tuc de tranh qua tai dich vu mien phi)
    navRerouteTimer = setInterval(() => {
      if (!meMarker) return;
      const pos = meMarker.getLatLng();
      refreshNavigationRoute(pos.lat, pos.lng);
    }, 25000);
  }

  async function refreshNavigationRoute(lat, lng) {
    if (!lastRouteDestination) return;
    try {
      const localHour = new Date().getHours();
      const data = await Api.get(
        `/api/geo/route?fromLat=${lat}&fromLng=${lng}&toLat=${lastRouteDestination.lat}&toLng=${lastRouteDestination.lng}&mode=${currentMode}&localHour=${localHour}`
      );
      drawRoute(data);
      renderCongestion(data);
    } catch (e) { /* giu tuyen cu neu lam moi that bai */ }
  }

  function stopNavigation() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (navRerouteTimer) clearInterval(navRerouteTimer);
    watchId = null;
    navRerouteTimer = null;
    document.getElementById("btnStartNav").style.display = "inline-flex";
    document.getElementById("btnStopNav").style.display = "none";
    document.getElementById("navStatus").style.display = "none";
    showToast("Đã dừng điều hướng");
  }

  // ---------------- YEU THICH (co phan loai) ----------------
  async function loadFavorites() {
    if (!hasPermission("favorites")) return;
    try {
      const data = await Api.get("/api/favorites");
      lastFavorites = data.favorites || [];
      renderFavoritesList();
      renderFavoriteMarkers(lastFavorites);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function bindFavFilters() {
    document.querySelectorAll(".fav-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".fav-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        favFilter = chip.dataset.cat;
        renderFavoritesList();
      });
    });
  }

  function renderFavoritesList() {
    const body = document.getElementById("favListBody");
    const favs = favFilter === "all" ? lastFavorites : lastFavorites.filter(f => f.category === favFilter);
    if (!favs.length) {
      body.innerHTML = '<div class="empty-state">Chưa có địa điểm yêu thích nào ở danh mục này.<br/>Tìm kiếm hoặc nhấp phải trên bản đồ để thêm.</div>';
      return;
    }
    body.innerHTML = favs.map(f => `
      <div class="fav-item" data-lat="${f.lat}" data-lng="${f.lng}" data-name="${escapeHtml(f.name)}">
        <div class="fav-name">📍 ${escapeHtml(f.name)}</div>
        <div class="fav-addr">${escapeHtml(f.address || "")}</div>
        <span class="fav-cat-tag">${FAV_CATEGORY_LABELS[f.category] || FAV_CATEGORY_LABELS.other}</span>
        <div class="fav-actions">
          <button class="btn btn-danger btn-sm" data-del-fav="${f.id}">Xóa</button>
        </div>
      </div>
    `).join("");

    body.querySelectorAll(".fav-item").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-del-fav]")) return;
        openPlaceDetail({ name: el.dataset.name, lat: Number(el.dataset.lat), lng: Number(el.dataset.lng) });
      });
    });
    body.querySelectorAll("[data-del-fav]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await Api.del(`/api/favorites/${btn.dataset.delFav}`);
          showToast("Đã xóa khỏi yêu thích");
          loadFavorites();
        } catch (err) { showToast(err.message, true); }
      });
    });
  }

  function renderFavoriteMarkers(favs) {
    Object.values(favMarkers).forEach(m => map.removeLayer(m));
    favMarkers = {};
    favs.forEach(f => {
      const m = L.marker([f.lat, f.lng], { icon: favIcon }).addTo(map)
        .bindPopup(`<b>${escapeHtml(f.name)}</b><br/>${escapeHtml(f.address || "")}`);
      m.on("click", () => openPlaceDetail({ name: f.name, lat: f.lat, lng: f.lng, address: f.address }));
      favMarkers[f.id] = m;
    });
  }

  // ---------------- QUAN LY QUANG CAO DOANH NGHIEP (tai khoan Business) ----------------
  function bindBusinessPanel() {
    document.getElementById("btnCreateBusiness").addEventListener("click", () => {
      showBusinessForm({ id: "", name: "", category: "restaurant", description: "", phone: "", address: "", lat: null, lng: null });
    });

    document.getElementById("bizPinBtn").addEventListener("click", () => {
      pinMode = pinMode === "business" ? null : "business";
      document.getElementById("bizPinBtn").classList.toggle("active", pinMode === "business");
      if (pinMode === "business") showToast("Nhấp vào bản đồ để chọn vị trí quảng cáo");
    });

    document.getElementById("btnSaveBusiness").addEventListener("click", saveBusinessListing);
    document.getElementById("btnDeleteBusiness").addEventListener("click", deleteBusinessListingUi);
  }

  function showBusinessForm(listing) {
    document.getElementById("businessEmptyState").style.display = "none";
    document.getElementById("btnCreateBusiness").style.display = "none";
    const form = document.getElementById("businessForm");
    form.style.display = "block";

    document.getElementById("bizId").value = listing.id || "";
    document.getElementById("bizName").value = listing.name || "";
    document.getElementById("bizCategory").value = listing.category || "restaurant";
    document.getElementById("bizDescription").value = listing.description || "";
    document.getElementById("bizPhone").value = listing.phone || "";
    document.getElementById("bizAddress").value = listing.address || (listing.lat ? `${listing.lat.toFixed(5)}, ${listing.lng.toFixed(5)}` : "");
    pendingBusinessCoord = listing.lat ? { lat: listing.lat, lng: listing.lng } : null;
    document.getElementById("btnDeleteBusiness").style.display = listing.id ? "block" : "none";
  }

  async function setBusinessLocation(lat, lng) {
    pendingBusinessCoord = { lat, lng };
    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const data = await Api.get(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      address = data.address;
    } catch (e) { /* fallback toa do */ }
    document.getElementById("bizAddress").value = address;
  }

  async function loadMyBusiness() {
    if (!AppState.user.isBusiness && AppState.user.role !== "ADMIN") return;
    try {
      const data = await Api.get("/api/business/mine");
      myBusinessListings = data.listings || [];
      if (myBusinessListings.length) {
        showBusinessForm(myBusinessListings[0]);
      } else {
        document.getElementById("businessForm").style.display = "none";
        document.getElementById("businessEmptyState").style.display = "block";
        document.getElementById("btnCreateBusiness").style.display = "block";
      }
    } catch (e) {
      showToast(e.message, true);
    }
  }

  async function saveBusinessListing() {
    const id = document.getElementById("bizId").value;
    const name = document.getElementById("bizName").value.trim();
    const category = document.getElementById("bizCategory").value;
    const description = document.getElementById("bizDescription").value.trim();
    const phone = document.getElementById("bizPhone").value.trim();
    const address = document.getElementById("bizAddress").value.trim();

    if (!name) return showToast("Vui lòng nhập tên địa điểm", true);
    if (!pendingBusinessCoord) return showToast("Vui lòng chọn vị trí trên bản đồ (nút 📌)", true);

    try {
      if (id) {
        await Api.patch(`/api/business/${id}`, { name, category, description, phone, address, lat: pendingBusinessCoord.lat, lng: pendingBusinessCoord.lng });
        showToast("Đã cập nhật địa điểm quảng cáo");
      } else {
        await Api.post("/api/business", { name, category, description, phone, address, lat: pendingBusinessCoord.lat, lng: pendingBusinessCoord.lng });
        showToast("Đã tạo địa điểm quảng cáo 🏷️");
      }
      loadMyBusiness();
      loadBusinessMarkersInView();
    } catch (e) {
      showToast(e.message, true);
    }
  }

  async function deleteBusinessListingUi() {
    const id = document.getElementById("bizId").value;
    if (!id) return;
    if (!confirm("Xóa địa điểm quảng cáo này?")) return;
    try {
      await Api.del(`/api/business/${id}`);
      showToast("Đã xóa địa điểm quảng cáo");
      loadMyBusiness();
      loadBusinessMarkersInView();
    } catch (e) {
      showToast(e.message, true);
    }
  }

  // ---------------- LIEN KET SAU (mo tu QR / link chia se) ----------------
  function handleDeepLinkFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const name = params.get("name") || null;
      setTimeout(() => openPlaceDetail({ name, lat, lng }), 400);
    }
  }

  document.addEventListener("DOMContentLoaded", bindFavFilters);

  return { init, invalidateSize, loadFavorites, applyTierToRouteUI, loadMyBusiness };
})();

window.MapModule = MapModule;
