// js/pwa.js
// Dang ky service worker (bat buoc de trinh duyet coi day la PWA "cai duoc")
// va xu ly nut "Tai ung dung" that su (khong phai link gia toi cho ung dung).

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Khong chan trai nghiem neu dang ky that bai (vi du chay qua http khong an toan)
    });
  });
}

const PwaInstall = (() => {
  let deferredPrompt = null;
  const listeners = [];

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach(fn => fn(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach(fn => fn(false));
  });

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  async function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return choice.outcome; // 'accepted' | 'dismissed'
    }
    return null; // Khong co prompt san (vi du iOS Safari) -> UI se hien huong dan thu cong
  }

  function onAvailabilityChange(fn) { listeners.push(fn); }

  return { promptInstall, onAvailabilityChange, isStandalone, isIos, hasPrompt: () => !!deferredPrompt };
})();

window.PwaInstall = PwaInstall;
