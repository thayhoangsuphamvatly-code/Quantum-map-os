// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const favoriteRoutes = require("./src/routes/favorites");
const geoRoutes = require("./src/routes/geo");
const store = require("./src/store");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Khoi tao / kiem tra database (tu dong tao tai khoan Admin goc neu chua co)
store.ensureLoaded();

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/geo", geoRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Phuc vu frontend tinh
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Khong tim thay API" });
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n=== MapViet Neon dang chay tai http://localhost:${PORT} ===`);
  console.log(`Tai khoan Admin mac dinh: ${store.ADMIN_USERNAME}`);
  console.log(`(Mat khau da duoc thiet lap san theo yeu cau cua ban)\n`);
});
