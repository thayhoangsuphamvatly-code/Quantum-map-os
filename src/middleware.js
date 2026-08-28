// src/middleware.js
const { verifyToken } = require("./auth");
const store = require("./store");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Chua dang nhap" });
  }
  try {
    const payload = verifyToken(token);
    const user = store.findUserById(payload.id);
    if (!user) return res.status(401).json({ error: "Tai khoan khong ton tai" });
    if (user.status === "locked") {
      return res.status(403).json({ error: "Tai khoan da bi khoa" });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Chi tai khoan Admin moi duoc thuc hien thao tac nay" });
  }
  next();
}

function requirePermission(permKey) {
  return (req, res, next) => {
    if (req.user.role === "ADMIN") return next(); // admin luon co day du quyen
    const allowed = req.user.permissions && req.user.permissions[permKey];
    if (!allowed) {
      return res.status(403).json({ error: "Tai khoan cua ban khong duoc cap quyen su dung tinh nang nay" });
    }
    next();
  };
}

module.exports = { authenticate, requireAdmin, requirePermission };
