(function () {
  // Neu da dang nhap roi thi vao thang trang chinh
  if (Api.getToken()) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    btn.disabled = true;
    btn.textContent = "Đang đăng nhập...";
    try {
      const data = await Api.post("/api/auth/login", { username, password });
      Api.setToken(data.token);
      window.location.href = "index.html";
    } catch (err) {
      errorBox.textContent = err.message || "Đăng nhập thất bại";
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Đăng nhập";
    }
  });
})();
