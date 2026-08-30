// Lop goi API dung chung cho toan bo frontend.
const Api = (() => {
  const TOKEN_KEY = "quantum_map_os_token";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(method, url, body) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    const resp = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    let data = null;
    try { data = await resp.json(); } catch (e) { /* respuesta vacia */ }

    if (!resp.ok) {
      const message = (data && data.error) || `Loi ${resp.status}`;
      const err = new Error(message);
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  return {
    getToken, setToken, clearToken,
    get: (url) => request("GET", url),
    post: (url, body) => request("POST", url, body),
    patch: (url, body) => request("PATCH", url, body),
    del: (url) => request("DELETE", url)
  };
})();
