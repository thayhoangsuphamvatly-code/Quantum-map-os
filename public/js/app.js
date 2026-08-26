// js/app.js
// Trang thai chung + dieu huong giua cac view (Ban do / Yeu thich / Tim duong / Admin)

const AppState = {
  user: null
};

function showToast(message, isError) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.remove("error");
  if (isError) t.classList.add("error");
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

function applyPermissionsToUi() {
  const perms = AppState.user.permissions || {};
  const isAdmin = AppState.user.role === "ADMIN";

  const routeNav = document.querySelector('.nav-item[data-view="route"]');
  const favNav = document.querySelector('.nav-item[data-view="favorites"]');
  const btnRoutePanel = document.getElementById("btnRoutePanel");
  const btnFavPanel = document.getElementById("btnFavPanel");
  const btnLocate = document.getElementById("btnLocate");
  const searchBox = document.querySelector(".search-box");

  const setDisabled = (el, disabled, msg) => {
    if (!el) return;
    el.style.opacity = disabled ? 0.35 : 1;
    el.style.pointerEvents = disabled ? "none" : "auto";
    if (disabled) el.title = msg || "Tài khoản của bạn không được cấp quyền này";
  };

  if (!isAdmin) {
    setDisabled(routeNav, !perms.route);
    setDisabled(btnRoutePanel, !perms.route);
    setDisabled(favNav, !perms.favorites);
    setDisabled(btnFavPanel, !perms.favorites);
    setDisabled(btnLocate, !perms.locate);
    setDisabled(searchBox, !perms.search);
  }

  document.getElementById("navAdmin").style.display = isAdmin ? "flex" : "none";
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.view === view);
  });

  const adminView = document.getElementById("adminView");
  const shell = document.getElementById("shell");

  if (view === "admin") {
    adminView.classList.add("open");
    if (window.AdminModule) window.AdminModule.loadUsers();
    return;
  }
  adminView.classList.remove("open");

  document.getElementById("routePanel").classList.remove("open");
  document.getElementById("favPanel").classList.remove("open");

  if (view === "route") {
    if (!AppState.user.permissions.route && AppState.user.role !== "ADMIN") {
      showToast("Tài khoản của bạn không được cấp quyền tìm đường", true);
      return;
    }
    document.getElementById("routePanel").classList.add("open");
  }
  if (view === "favorites") {
    if (!AppState.user.permissions.favorites && AppState.user.role !== "ADMIN") {
      showToast("Tài khoản của bạn không được cấp quyền lưu yêu thích", true);
      return;
    }
    document.getElementById("favPanel").classList.add("open");
    if (window.MapModule) window.MapModule.loadFavorites();
  }
  setTimeout(() => { if (window.MapModule) window.MapModule.invalidateSize(); }, 60);
}

function initNav() {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", () => switchView(el.dataset.view));
  });

  document.getElementById("btnBackFromAdmin").addEventListener("click", () => switchView("map"));

  document.getElementById("btnRoutePanel").addEventListener("click", () => {
    const p = document.getElementById("routePanel");
    if (p.classList.contains("open")) { p.classList.remove("open"); return; }
    switchView("route");
  });
  document.getElementById("btnFavPanel").addEventListener("click", () => {
    const p = document.getElementById("favPanel");
    if (p.classList.contains("open")) { p.classList.remove("open"); return; }
    switchView("favorites");
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.remove("open");
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    Api.clearToken();
    window.location.href = "login.html";
  });

  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", () => document.getElementById("sidebar").classList.remove("open"));
  });
}

async function bootstrap() {
  if (!Api.getToken()) {
    window.location.href = "login.html";
    return;
  }
  try {
    const data = await Api.get("/api/auth/me");
    AppState.user = data.user;
  } catch (e) {
    Api.clearToken();
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userFullName").textContent = AppState.user.fullName;
  document.getElementById("userRoleLabel").textContent = AppState.user.role === "ADMIN" ? "Quản trị viên" : "Người dùng";
  document.getElementById("avatarInitial").textContent = (AppState.user.fullName || "?").trim().charAt(0).toUpperCase();
  document.getElementById("shell").style.display = "flex";

  applyPermissionsToUi();
  initNav();

  if (window.MapModule) window.MapModule.init();
}

document.addEventListener("DOMContentLoaded", bootstrap);
