// src/routes/admin.js
const express = require("express");
const router = express.Router();
const store = require("../store");
const { authenticate, requireAdmin } = require("../middleware");

router.use(authenticate, requireAdmin);

// Danh sach tat ca tai khoan
router.get("/users", (req, res) => {
  res.json({ users: store.listUsers() });
});

// Tao tai khoan moi - CHI ADMIN duoc phep (khong co dang ky cong khai)
router.post("/users", (req, res) => {
  const { username, password, fullName, role, permissions } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Vui long nhap ten tai khoan va mat khau" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Mat khau phai co it nhat 6 ky tu" });
  }
  try {
    const user = store.createUser({ username: username.trim(), password, fullName, role, permissions });
    res.status(201).json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Cap nhat tai khoan: doi ten, vai tro, trang thai, quyen han, mat khau
router.patch("/users/:id", (req, res) => {
  try {
    const user = store.updateUser(req.params.id, req.body || {});
    res.json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Xoa tai khoan (khong the xoa admin goc)
router.delete("/users/:id", (req, res) => {
  try {
    store.deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
