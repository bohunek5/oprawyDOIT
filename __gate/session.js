(() => {
  'use strict';
  const CONFIG = {"version":1,"format":"sealed-pages-v1","build":"3807d1e838b661ffcd4248b7edf27894","basepath":"/oprawyDOIT/","cipher":"AES-256-GCM","kdf":"PBKDF2","hash":"SHA-256","iterations":600000,"salt":"hqwk9ZipwUgheoSG85SQXX3vZGtzDwDjwcgIAzC3tLk=","manifest":"0f7ad5b07a26fad73247e9ccd45b8ffa6c864c8e41d9cfb03151794e5a5f9264","chunkSize":4194304};
  const STORAGE = 'sealed-pages:' + CONFIG.basepath + ':' + CONFIG.build;
  const REVISION = 'sealed-pages-logout:' + CONFIG.basepath;
  let locking = false;
  const revision = () => { try { return localStorage.getItem(REVISION) || ''; } catch { return ''; } };
  const readKey = () => { try { return sessionStorage.getItem(STORAGE + ':revision') === revision() ? sessionStorage.getItem(STORAGE) : null; } catch { return null; } };
  const clear = () => { try { sessionStorage.removeItem(STORAGE); sessionStorage.removeItem(STORAGE + ':revision'); } catch {} };
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sealed-pages-lock:' + CONFIG.basepath) : null;
  const lockDocument = () => {
    if (locking) return;
    locking = true;
    clear();
    // Remove already-rendered private content before navigating back to the gate.
    document.documentElement.style.visibility = 'hidden';
    location.reload();
  };
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SEALED_KEY_REQUEST' && event.data.build === CONFIG.build) event.ports[0]?.postMessage({key: readKey()});
    if (event.data?.type === 'SEALED_LOCKED') lockDocument();
  });
  if (channel) channel.onmessage = event => { if (event.data === 'lock') lockDocument(); };
  const lock = () => {
    // Nonsecret shared generation invalidates keys held by a suspended tab or
    // an image/PDF document without executing application JavaScript there.
    try { localStorage.setItem(REVISION, crypto.randomUUID()); } catch {}
    clear();
    channel?.postMessage('lock');
    const controller = navigator.serviceWorker.controller;
    if (!controller) { lockDocument(); return; }
    const port = new MessageChannel();
    const timer = setTimeout(lockDocument, 2000);
    port.port1.onmessage = () => { clearTimeout(timer); port.port1.close(); lockDocument(); };
    controller.postMessage({type: 'SEALED_LOCK', build: CONFIG.build}, [port.port2]);
  };
  // The application may use this API for its own logout button.
  Object.defineProperty(window, 'lockProtectedSite', {value: lock, writable: false});
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && event.shiftKey) { event.preventDefault(); lock(); } });
  window.addEventListener('pageshow', event => {
    // A browser may restore a document from back/forward cache without a fetch.
    if (event.persisted && !readKey()) lockDocument();
  });
  window.addEventListener('storage', event => { if (event.key === REVISION && !readKey()) lockDocument(); });
  // An old application PWA must never replace the protecting Service Worker.
  try {
    Object.defineProperty(navigator.serviceWorker, 'register', {value: () => Promise.reject(new DOMException('The protected site manages its Service Worker.', 'NotAllowedError')), writable: false});
  } catch {}
  function addLockButton() {
    const container = document.createElement('div');
    container.setAttribute('data-sealed-lock', '');
    const shadow = container.attachShadow({mode: 'closed'});
    const style = document.createElement('style');
    style.textContent = ':host{all:initial!important;position:fixed!important;right:12px!important;bottom:12px!important;z-index:2147483647!important}button{font:12px/1.3 system-ui,sans-serif;color:#26384d;background:#fffffff2;border:1px solid #c5ced9;border-radius:7px;padding:8px 11px;box-shadow:0 2px 9px #0001;cursor:pointer}button:focus-visible{outline:3px solid #90b4e5;outline-offset:2px}';
    const button = document.createElement('button');
    button.textContent = 'Zablokuj';
    button.title = 'Zablokuj podgląd we wszystkich kartach (Shift+Esc)';
    button.addEventListener('click', lock);
    shadow.append(style, button);
    document.body.append(container);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addLockButton, {once: true});
  else addLockButton();
})();
