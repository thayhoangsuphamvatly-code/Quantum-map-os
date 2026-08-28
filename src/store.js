// src/store.js
// Kho du lieu don gian dua tren file JSON (khong can cai dat database ngoai).
// Du du dung cho do an nho/vua va de trien khai o moi may (khong build native).

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

const ADMIN_USERNAME = "tunglaihoclaptrinhmobile@1234";
const ADMIN_PASSWORD = "TtungnguyenhoangNHmobile@142010";

function defaultPermissions(all = true) {
  return {
    search: all,   // duoc phep tim kiem dia diem
    route: all,    // duoc phep tim duong di
    locate: all,   // duoc phep dinh vi vi tri hien tai
    favorites: all // duoc phep them/xoa dia diem yeu thich
  };
}

function nowIso() {
  return new Date().toISOString();
}

function seedDb() {
  const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  return {
    nextUserId: 2,
    nextFavId: 1,
    users: [
      {
        id: 1,
        username: ADMIN_USERNAME,
        passwordHash: adminHash,
        fullName: "Tung Nguyen (System Admin)",
        role: "ADMIN",
        status: "active",
        permissions: defaultPermissions(true),
        isRoot: true,
        createdAt: nowIso()
      }
    ],
    favorites: []
  };
}

let cache = null;

function ensureLoaded() {
  if (cache) return cache;
  if (!fs.existsSync(DB_FILE)) {
    cache = seedDb();
    persist();
    return cache;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    cache = JSON.parse(raw);
    // Dam bao tai khoan admin goc luon ton tai ngay ca khi file bi chinh sua tay
    const rootAdmin = cache.users.find(u => u.username === ADMIN_USERNAME);
    if (!rootAdmin) {
      const seeded = seedDb();
      cache.users.unshift(seeded.users[0]);
    }
  } catch (e) {
    console.error("Loi doc database, khoi tao lai tu dau:", e.message);
    cache = seedDb();
    persist();
  }
  return cache;
}

function persist() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// ---------- USERS ----------

function listUsers() {
  ensureLoaded();
  return cache.users.map(publicUser);
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

function findUserByUsername(username) {
  ensureLoaded();
  return cache.users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
}

function findUserById(id) {
  ensureLoaded();
  return cache.users.find(u => u.id === Number(id));
}

function createUser({ username, password, fullName, role, permissions }) {
  ensureLoaded();
  if (findUserByUsername(username)) {
    throw new Error("Ten tai khoan da ton tai");
  }
  const user = {
    id: cache.nextUserId++,
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    fullName: fullName || username,
    role: role === "ADMIN" ? "ADMIN" : "USER",
    status: "active",
    permissions: { ...defaultPermissions(true), ...(permissions || {}) },
    isRoot: false,
    createdAt: nowIso()
  };
  cache.users.push(user);
  persist();
  return publicUser(user);
}

function updateUser(id, updates) {
  ensureLoaded();
  const user = findUserById(id);
  if (!user) throw new Error("Khong tim thay tai khoan");
  if (user.isRoot && (updates.role === "USER" || updates.status === "locked")) {
    throw new Error("Khong the ha quyen hoac khoa tai khoan admin goc");
  }
  if (typeof updates.fullName === "string") user.fullName = updates.fullName;
  if (updates.role === "ADMIN" || updates.role === "USER") user.role = updates.role;
  if (updates.status === "active" || updates.status === "locked") user.status = updates.status;
  if (updates.permissions && typeof updates.permissions === "object") {
    user.permissions = { ...user.permissions, ...updates.permissions };
  }
  if (updates.password) {
    user.passwordHash = bcrypt.hashSync(updates.password, 10);
  }
  persist();
  return publicUser(user);
}

function deleteUser(id) {
  ensureLoaded();
  const user = findUserById(id);
  if (!user) throw new Error("Khong tim thay tai khoan");
  if (user.isRoot) throw new Error("Khong the xoa tai khoan admin goc");
  cache.users = cache.users.filter(u => u.id !== Number(id));
  cache.favorites = cache.favorites.filter(f => f.userId !== Number(id));
  persist();
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash);
}

// ---------- FAVORITES ----------

function listFavorites(userId) {
  ensureLoaded();
  return cache.favorites
    .filter(f => f.userId === Number(userId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function addFavorite(userId, { name, lat, lng, address }) {
  ensureLoaded();
  const fav = {
    id: cache.nextFavId++,
    userId: Number(userId),
    name: name || address || `Dia diem (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    lat,
    lng,
    address: address || "",
    createdAt: nowIso()
  };
  cache.favorites.push(fav);
  persist();
  return fav;
}

function removeFavorite(userId, favId) {
  ensureLoaded();
  const before = cache.favorites.length;
  cache.favorites = cache.favorites.filter(
    f => !(f.id === Number(favId) && f.userId === Number(userId))
  );
  persist();
  return cache.favorites.length !== before;
}

module.exports = {
  ADMIN_USERNAME,
  ensureLoaded,
  listUsers,
  publicUser,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  listFavorites,
  addFavorite,
  removeFavorite,
  defaultPermissions
};
