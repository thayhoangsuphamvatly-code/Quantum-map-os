// js/admin.js
// Quan ly tai khoan: chi Admin thay va thao tac duoc (server cung kiem tra lai quyen nay).

const AdminModule = (() => {
  let usersCache = [];
  let businessCache = [];

  function el(id) { return document.getElementById(id); }

  async function loadUsers() {
    try {
      const data = await Api.get("/api/admin/users");
      usersCache = data.users;
      renderTable();
    } catch (e) {
      showToast(e.message, true);
    }
  }

  async function loadBusiness() {
    try {
      const data = await Api.get("/api/admin/business");
      businessCache = data.listings || [];
      renderBusinessTable();
    } catch (e) {
      showToast(e.message, true);
    }
  }

  const BIZ_CATEGORY_LABEL = {
    restaurant: "🍜 Ăn uống", cafe: "☕ Cà phê", hotel: "🏨 Khách sạn",
    shop: "🛍️ Cửa hàng", service: "🔧 Dịch vụ", other: "📍 Khác"
  };

  function renderBusinessTable() {
    const tbody = el("businessTableBody");
    if (!businessCache.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-faint); text-align:center; padding:24px;">Chưa có địa điểm quảng cáo nào.</td></tr>';
      return;
    }
    tbody.innerHTML = businessCache.map(b => `
      <tr>
        <td>🏷️ ${escapeHtml(b.name)}</td>
        <td>${BIZ_CATEGORY_LABEL[b.category] || b.category}</td>
        <td>${escapeHtml(b.ownerUsername)}</td>
        <td>${escapeHtml(b.address || "")}</td>
        <td><button class="btn btn-danger btn-sm" data-del-biz="${b.id}">Gỡ bỏ</button></td>
      </tr>
    `).join("");
    tbody.querySelectorAll("[data-del-biz]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Gỡ bỏ địa điểm quảng cáo này?")) return;
        try {
          await Api.del(`/api/admin/business/${btn.dataset.delBiz}`);
          showToast("Đã gỡ bỏ quảng cáo");
          loadBusiness();
        } catch (e) { showToast(e.message, true); }
      });
    });
  }

  function permTags(perms) {
    const map = { search: "Tìm kiếm", route: "Tìm đường", locate: "Định vị", favorites: "Yêu thích" };
    return Object.keys(map).map(k => {
      const on = !!(perms && perms[k]);
      return `<span class="perm-tag ${on ? "on" : ""}">${map[k]}</span>`;
    }).join("");
  }

  function renderTable() {
    const tbody = el("userTableBody");
    tbody.innerHTML = usersCache.map(u => {
      const tierLabel = u.role === "ADMIN" ? "TOÀN QUYỀN" : (u.tier === "PRO" ? "PRO" : "STANDARD");
      const tierClass = u.role === "ADMIN" ? "admin" : (u.tier === "PRO" ? "pro" : "standard");
      const bizBadge = u.isBusiness ? ' <span class="badge business">🏷️ DN</span>' : "";
      return `
      <tr data-id="${u.id}">
        <td>${escapeHtml(u.username)}${u.isRoot ? ' <span class="perm-tag on" title="Tài khoản admin gốc">GỐC</span>' : ""}</td>
        <td>${escapeHtml(u.fullName)}</td>
        <td><span class="badge ${u.role === "ADMIN" ? "admin" : "user"}">${u.role}</span></td>
        <td><span class="badge ${tierClass}">${tierLabel}</span>${bizBadge}</td>
        <td><span class="badge ${u.status === "active" ? "active" : "locked"}">${u.status === "active" ? "HOẠT ĐỘNG" : "ĐÃ KHÓA"}</span></td>
        <td><div class="perm-tags">${u.role === "ADMIN" ? '<span class="perm-tag on">Toàn quyền</span>' : permTags(u.permissions)}</div></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-edit="${u.id}">Sửa</button>
            ${u.role !== "ADMIN" ? `<button class="btn btn-ghost btn-sm" data-toggle-lock="${u.id}">${u.status === "active" ? "Khóa" : "Mở khóa"}</button>` : ""}
            ${!u.isRoot ? `<button class="btn btn-danger btn-sm" data-del="${u.id}">Xóa</button>` : ""}
          </div>
        </td>
      </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openEditModal(b.dataset.edit)));
    tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => deleteUser(b.dataset.del)));
    tbody.querySelectorAll("[data-toggle-lock]").forEach(b => b.addEventListener("click", () => toggleLock(b.dataset.toggleLock)));
  }

  function openCreateModal() {
    el("userModalTitle").textContent = "Tạo Tài Khoản Mới";
    el("editUserId").value = "";
    el("mUsername").value = "";
    el("mUsername").disabled = false;
    el("mFullName").value = "";
    el("mPassword").value = "";
    el("mPasswordLabel").textContent = "Mật khẩu";
    el("mRole").value = "USER";
    el("mTier").value = "STANDARD";
    el("mIsBusiness").checked = false;
    updateTierFieldVisibility();
    setPermChecks({ search: true, route: true, locate: true, favorites: true });
    el("userModal").classList.add("open");
  }

  function openEditModal(id) {
    const u = usersCache.find(x => String(x.id) === String(id));
    if (!u) return;
    el("userModalTitle").textContent = "Chỉnh Sửa Tài Khoản";
    el("editUserId").value = u.id;
    el("mUsername").value = u.username;
    el("mUsername").disabled = true; // khong doi ten tai khoan de tranh nham lan dang nhap
    el("mFullName").value = u.fullName;
    el("mPassword").value = "";
    el("mPasswordLabel").textContent = "Mật khẩu mới (để trống nếu không đổi)";
    el("mRole").value = u.role;
    el("mTier").value = u.tier === "PRO" ? "PRO" : "STANDARD";
    el("mIsBusiness").checked = !!u.isBusiness;
    updateTierFieldVisibility();
    setPermChecks(u.permissions || {});
    el("userModal").classList.add("open");
  }

  function updateTierFieldVisibility() {
    // Admin luon tu dong co day du tinh nang PRO nen an lua chon hang khi vai tro la ADMIN
    el("mTierField").style.display = el("mRole").value === "ADMIN" ? "none" : "block";
  }

  function setPermChecks(p) {
    el("permSearch").checked = !!p.search;
    el("permRoute").checked = !!p.route;
    el("permLocate").checked = !!p.locate;
    el("permFavorites").checked = !!p.favorites;
  }

  function closeModal() { el("userModal").classList.remove("open"); }

  async function saveUser() {
    const id = el("editUserId").value;
    const permissions = {
      search: el("permSearch").checked,
      route: el("permRoute").checked,
      locate: el("permLocate").checked,
      favorites: el("permFavorites").checked
    };
    const role = el("mRole").value;
    const tier = el("mTier").value;
    const isBusiness = el("mIsBusiness").checked;
    const fullName = el("mFullName").value.trim();
    const password = el("mPassword").value;

    try {
      if (id) {
        const payload = { fullName, role, tier, isBusiness, permissions };
        if (password) payload.password = password;
        await Api.patch(`/api/admin/users/${id}`, payload);
        showToast("Đã cập nhật tài khoản");
      } else {
        const username = el("mUsername").value.trim();
        if (!username || !password) return showToast("Vui lòng nhập đầy đủ tài khoản và mật khẩu", true);
        await Api.post("/api/admin/users", { username, password, fullName, role, tier, isBusiness, permissions });
        showToast("Đã tạo tài khoản mới");
      }
      closeModal();
      loadUsers();
    } catch (e) {
      showToast(e.message, true);
    }
  }

  async function deleteUser(id) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này? Hành động không thể hoàn tác.")) return;
    try {
      await Api.del(`/api/admin/users/${id}`);
      showToast("Đã xóa tài khoản");
      loadUsers();
    } catch (e) { showToast(e.message, true); }
  }

  async function toggleLock(id) {
    const u = usersCache.find(x => String(x.id) === String(id));
    if (!u) return;
    const newStatus = u.status === "active" ? "locked" : "active";
    try {
      await Api.patch(`/api/admin/users/${id}`, { status: newStatus });
      showToast(newStatus === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      loadUsers();
    } catch (e) { showToast(e.message, true); }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  function bindEvents() {
    el("btnCreateUser").addEventListener("click", openCreateModal);
    el("btnCancelUserModal").addEventListener("click", closeModal);
    el("btnSaveUser").addEventListener("click", saveUser);
    el("userModal").addEventListener("click", (e) => { if (e.target.id === "userModal") closeModal(); });
    el("mRole").addEventListener("change", updateTierFieldVisibility);
  }

  document.addEventListener("DOMContentLoaded", bindEvents);

  return { loadUsers, loadBusiness };
})();

window.AdminModule = AdminModule;
