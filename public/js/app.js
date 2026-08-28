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
  const routeBn = document.querySelector('.bn-item[data-view="route"]');
  const favBn = document.querySelector('.bn-item[data-view="favorites"]');
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
    setDisabled(routeBn, !perms.route);
    setDisabled(btnRoutePanel, !perms.route);
    setDisabled(favNav, !perms.favorites);
    setDisabled(favBn, !perms.favorites);
    setDisabled(btnFavPanel, !perms.favorites);
    setDisabled(btnLocate, !perms.locate);
    setDisabled(searchBox, !perms.search);
  }

  document.getElementById("navAdmin").style.display = isAdmin ? "flex" : "none";
  document.getElementById("navAdminMobile").style.display = isAdmin ? "flex" : "none";
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.view === view);
  });
  document.querySelectorAll(".bn-item[data-view]").forEach(el => {
    el.classList.toggle("active", el.dataset.view === view);
  });
  document.getElementById("moreSheetOverlay").classList.remove("open");

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
    if (p.classList.contains("open")) {
      p.classList.remove("open");
      setTimeout(() => { if (window.MapModule) window.MapModule.invalidateSize(); }, 220);
      return;
    }
    switchView("route");
  });
  document.getElementById("btnFavPanel").addEventListener("click", () => {
    const p = document.getElementById("favPanel");
    if (p.classList.contains("open")) {
      p.classList.remove("open");
      setTimeout(() => { if (window.MapModule) window.MapModule.invalidateSize(); }, 220);
      return;
    }
    switchView("favorites");
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.remove("open");
      setTimeout(() => { if (window.MapModule) window.MapModule.invalidateSize(); }, 220);
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", doLogout);
  document.getElementById("logoutBtnMobile").addEventListener("click", doLogout);

  // Thanh dieu huong duoi cung (mobile): Ban do / Tim duong / Yeu thich deu dung chung switchView
  document.querySelectorAll(".bn-item[data-view]").forEach(el => {
    el.addEventListener("click", () => switchView(el.dataset.view));
  });

  // Nut "Them" mo bottom-sheet chua thong tin tai khoan + quan ly tai khoan (neu la Admin) + dang xuat
  const moreOverlay = document.getElementById("moreSheetOverlay");
  document.getElementById("bnMore").addEventListener("click", () => moreOverlay.classList.add("open"));
  moreOverlay.addEventListener("click", (e) => {
    if (e.target === moreOverlay) moreOverlay.classList.remove("open");
  });
  document.getElementById("navAdminMobile").addEventListener("click", () => switchView("admin"));
}

function doLogout() {
  Api.clearToken();
  window.location.href = "login.html";
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

  const roleLabel = AppState.user.role === "ADMIN" ? "Quản trị viên" : "Người dùng";
  const initial = (AppState.user.fullName || "?").trim().charAt(0).toUpperCase();

  document.getElementById("userFullName").textContent = AppState.user.fullName;
  document.getElementById("userRoleLabel").textContent = roleLabel;
  document.getElementById("avatarInitial").textContent = initial;

  document.getElementById("userFullNameMobile").textContent = AppState.user.fullName;
  document.getElementById("userRoleLabelMobile").textContent = roleLabel;
  document.getElementById("avatarInitialMobile").textContent = initial;

  document.getElementById("shell").style.display = "flex";

  applyPermissionsToUi();
  initNav();

  if (window.MapModule) window.MapModule.init();
}

document.addEventListener("DOMContentLoaded", bootstrap);
