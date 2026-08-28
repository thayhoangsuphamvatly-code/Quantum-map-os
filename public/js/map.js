// js/map.js
// Toan bo logic ban do: khoi tao Leaflet, tim kiem, dinh vi, tim duong, yeu thich.

const MapModule = (() => {
  let map;
  let meMarker = null;
  let routeFromMarker = null;
  let routeToMarker = null;
  let routeLine = null;
  let favMarkers = {}; // id -> marker
  let pinMode = null; // 'from' | 'to' | null
  let routeFromCoord = null;
  let routeToCoord = null;
  let currentMode = "driving";

  const pulseIcon = L.divIcon({ className: "", html: '<div class="neon-pulse-icon"></div>', iconSize: [18, 18] });
  const favIcon = L.divIcon({ className: "", html: '<div class="fav-marker-icon"></div>', iconSize: [16, 16] });

  function init() {
    map = L.map("map", { zoomControl: true, attributionControl: true }).setView([21.0278, 105.8342], 13); // Ha Noi mac dinh

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    map.on("click", onMapClick);
    map.on("contextmenu", onMapRightClick);

    bindSearch();
    bindLocate();
    bindRoutePanel();
  }

  function invalidateSize() { if (map) map.invalidateSize(); }

  // ---------------- TIM KIEM ----------------
  function bindSearch() {
    const input = document.getElementById("searchInput");
    const btn = document.getElementById("searchBtn");
    const resultsBox = document.getElementById("searchResults");
    let debounceTimer = null;

    async function doSearch() {
      const q = input.value.trim();
      if (!q) { resultsBox.style.display = "none"; return; }
      if (!hasPermission("search")) return showToast("Bạn không có quyền tìm kiếm", true);
      try {
        const data = await Api.get(`/api/geo/search?q=${encodeURIComponent(q)}`);
        renderSearchResults(data.results);
      } catch (e) {
        showToast(e.message, true);
      }
    }

    function renderSearchResults(results) {
      if (!results || !results.length) {
        resultsBox.innerHTML = '<div class="search-result-item">Không tìm thấy kết quả phù hợp</div>';
        resultsBox.style.display = "block";
        return;
      }
      resultsBox.innerHTML = results.map((r, i) => `
        <div class="search-result-item" data-idx="${i}">
          <b>${escapeHtml(shortName(r.name))}</b>${escapeHtml(r.name)}
        </div>
      `).join("");
      resultsBox.style.display = "block";
      resultsBox.querySelectorAll(".search-result-item").forEach(el => {
        el.addEventListener("click", () => {
          const r = results[Number(el.dataset.idx)];
          if (!r) return;
          flyToPlace(r.lat, r.lng, r.name);
          resultsBox.style.display = "none";
          input.value = r.name;
        });
      });
    }

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 450);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
    btn.addEventListener("click", doSearch);
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) resultsBox.style.display = "none";
    });
  }

  function shortName(full) { return full.split(",")[0] + " · "; }

  let searchMarker = null;
  function flyToPlace(lat, lng, label) {
    map.flyTo([lat, lng], 16, { duration: 1.1 });
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lng]).addTo(map).bindPopup(buildPopupHtml(label, lat, lng)).openPopup();
    bindPopupFavoriteButton(searchMarker, label, lat, lng);
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

  // ---------------- CLICK BAN DO (chon diem / them yeu thich) ----------------
  async function onMapClick(e) {
    if (pinMode) {
      setRoutePoint(pinMode, e.latlng.lat, e.latlng.lng);
      pinMode = null;
      document.querySelectorAll(".pin").forEach(b => b.classList.remove("active"));
      return;
    }
  }

  async function onMapRightClick(e) {
    e.originalEvent.preventDefault();
    if (!hasPermission("favorites")) return showToast("Bạn không có quyền lưu yêu thích", true);
    const { lat, lng } = e.latlng;
    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const data = await Api.get(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
      address = data.address;
    } catch (err) { /* dung toa do neu loi */ }
    const popup = L.popup().setLatLng(e.latlng)
      .setContent(buildPopupHtml(address, lat, lng))
      .openOn(map);
    setTimeout(() => bindPopupFavoriteButtonByLatLng(lat, lng, address), 50);
  }

  function buildPopupHtml(label, lat, lng) {
    return `<div style="min-width:180px;">
      <div style="font-weight:700; margin-bottom:6px; font-size:13px;">${escapeHtml(label)}</div>
      <button class="btn btn-primary btn-sm" style="width:100%;" data-add-fav="${lat}|${lng}|${encodeURIComponent(label)}">⭐ Thêm vào yêu thích</button>
    </div>`;
  }

  function bindPopupFavoriteButton(marker, label, lat, lng) {
    marker.on("popupopen", () => attachFavButtonHandler(lat, lng, label));
  }
  function bindPopupFavoriteButtonByLatLng(lat, lng, label) {
    attachFavButtonHandler(lat, lng, label);
  }
  function attachFavButtonHandler(lat, lng, label) {
    document.querySelectorAll("[data-add-fav]").forEach(btn => {
      btn.onclick = async () => {
        try {
          await Api.post("/api/favorites", { name: label, lat, lng, address: label });
          showToast("Đã thêm vào yêu thích ⭐");
          loadFavorites();
          map.closePopup();
        } catch (e) { showToast(e.message, true); }
      };
    });
  }

  // ---------------- TIM DUONG ----------------
  function bindRoutePanel() {
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
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

  async function findRoute() {
    if (!hasPermission("route")) return showToast("Bạn không có quyền tìm đường", true);
    try {
      const from = await geocodeIfNeeded(routeFromCoord, "routeFrom");
      const to = await geocodeIfNeeded(routeToCoord, "routeTo");
      if (!from || !to) return showToast("Vui lòng nhập hoặc chọn đầy đủ điểm đi và điểm đến", true);

      showToast("Đang tính toán đường đi...");
      const data = await Api.get(`/api/geo/route?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}&mode=${currentMode}`);

      if (routeLine) map.removeLayer(routeLine);
      const latlngs = data.geometry.coordinates.map(c => [c[1], c[0]]);
      const color = currentMode === "walking" ? "#34d399" : "#22d3ee";
      routeLine = L.polyline(latlngs, { color, weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

      const km = (data.distanceMeters / 1000).toFixed(1);
      const mins = Math.round(data.durationSeconds / 60);
      document.getElementById("routeDistance").textContent = `${km} km`;
      document.getElementById("routeDuration").textContent =
        `Khoảng ${mins} phút · ${currentMode === "walking" ? "Đi bộ 🚶" : "Ô tô 🚗"}`;
      document.getElementById("routeSummary").classList.add("show");
    } catch (e) {
      showToast(e.message, true);
    }
  }

  // ---------------- YEU THICH ----------------
  async function loadFavorites() {
    if (!hasPermission("favorites")) return;
    const body = document.getElementById("favListBody");
    try {
      const data = await Api.get("/api/favorites");
      renderFavoritesList(data.favorites);
      renderFavoriteMarkers(data.favorites);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderFavoritesList(favs) {
    const body = document.getElementById("favListBody");
    if (!favs.length) {
      body.innerHTML = '<div class="empty-state">Chưa có địa điểm yêu thích nào.<br/>Tìm kiếm hoặc nhấp phải trên bản đồ để thêm.</div>';
      return;
    }
    body.innerHTML = favs.map(f => `
      <div class="fav-item" data-lat="${f.lat}" data-lng="${f.lng}">
        <div class="fav-name">📍 ${escapeHtml(f.name)}</div>
        <div class="fav-addr">${escapeHtml(f.address || "")}</div>
        <div class="fav-actions">
          <button class="btn btn-danger btn-sm" data-del-fav="${f.id}">Xóa</button>
        </div>
      </div>
    `).join("");

    body.querySelectorAll(".fav-item").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-del-fav]")) return;
        map.flyTo([Number(el.dataset.lat), Number(el.dataset.lng)], 16, { duration: 1 });
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
      favMarkers[f.id] = m;
    });
  }

  function hasPermission(key) {
    if (!AppState.user) return false;
    if (AppState.user.role === "ADMIN") return true;
    return !!(AppState.user.permissions && AppState.user.permissions[key]);
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  return { init, invalidateSize, loadFavorites };
})();

window.MapModule = MapModule;
