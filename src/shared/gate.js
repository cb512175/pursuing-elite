/* HoldFast early-tester gate + anonymous visit counter.
 *
 * ── TO CHANGE THE TESTER CODE ─────────────────────────────────────────────
 *  1. Pick a new code. Compute its hash (lowercase the code first, keep the "holdfast-tester:" prefix):
 *       printf '%s' 'holdfast-tester:mynewcode' | shasum -a 256
 *  2. Paste the 64-character result into HF_CODE_HASH below, rebuild (python3 src/build.py ..) and push.
 *  Everyone who unlocked with the old code is asked again (the device remembers the hash, not the code).
 *  See README.md → "Tester access code".
 * This is a LIGHT gate, not security: the app files are public, so anyone who views the page source can bypass it.
 */
(function () {
  "use strict";
  var HF_CODE_HASH = "f9a943b4ae38b02e0f29585284f8fc9a4868dba231e10932260e33acd2189b07";                 // ← the one constant to change (SHA-256 of "holdfast-tester:" + lowercase code)
  var HF_GATE_ENABLED = true;                              // set false to open the app to everyone
  var HF_UNLOCK_KEY = "holdfast-tester-unlock-v1";         // shared by both HoldFast apps on this site: enter the code once
  var HF_COUNTER = { base: "https://abacus.jasoncameron.dev", ns: "holdfast-testers-x7k2q9", enabled: true }; // Abacus: free, no account

  /* ---- compact SHA-256 (no dependencies, works on file:// and http://) ---- */
  function sha256(str) {
    function r(n, x) { return (x >>> n) | (x << (32 - n)); }
    var K = [], H = [], p = 2, c = 0, i, j;
    function isP(n) { for (var q = 2; q * q <= n; q++) if (n % q === 0) return false; return true; }
    while (c < 64) { if (isP(p)) { if (c < 8) H[c] = (Math.pow(p, .5) * 4294967296) | 0; K[c++] = (Math.pow(p, 1 / 3) * 4294967296) | 0; } p++; }
    var bytes = unescape(encodeURIComponent(str)), l = bytes.length, w = [];
    for (i = 0; i < l; i++) w[i >> 2] |= bytes.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[(((l + 8) >> 6) << 4) + 15] = l * 8;
    for (i = 0; i < w.length; i++) if (w[i] === undefined) w[i] = 0;
    for (j = 0; j < w.length; j += 16) {
      var W = w.slice(j, j + 16), a = H.slice(0), t;
      for (i = 0; i < 64; i++) {
        if (i >= 16) { var s0 = r(7, W[i - 15]) ^ r(18, W[i - 15]) ^ (W[i - 15] >>> 3), s1 = r(17, W[i - 2]) ^ r(19, W[i - 2]) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0; }
        var S1 = r(6, a[4]) ^ r(11, a[4]) ^ r(25, a[4]), ch = (a[4] & a[5]) ^ (~a[4] & a[6]), t1 = (a[7] + S1 + ch + K[i] + W[i]) | 0;
        var S0 = r(2, a[0]) ^ r(13, a[0]) ^ r(22, a[0]), mj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]), t2 = (S0 + mj) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
    }
    var out = ""; for (i = 0; i < 8; i++) out += ("00000000" + (H[i] >>> 0).toString(16)).slice(-8);
    return out;
  }
  function hashCode(code) { return sha256("holdfast-tester:" + String(code || "").trim().toLowerCase()); }

  var APP = window.APP || { id: "app", name: "HoldFast" };
  var params = new URLSearchParams(location.search);
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---- anonymous counter: increments only, once per device per day, per app and per event ---- */
  var slug = ({ pe: "pursuing-elite", ae: "achievement-equation" })[APP.id] || APP.id;
  var testMode = params.get("hfcount") === "test";                    // writes to separate "test-" keys so checks never touch real numbers
  var automated = !!(navigator.webdriver) && !params.has("hfcount");  // browser automation (our own tests) is never counted
  var counted = [];
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function count(kind) {
    if (!HF_COUNTER.enabled || automated) return Promise.resolve(null);
    var flag = "hf-ctr-" + slug + "-" + kind + (testMode ? "-test" : "");
    if (store.get(flag) === today()) return Promise.resolve(null);
    store.set(flag, today());
    var key = (testMode ? "test-" : "") + slug + "-" + kind;
    counted.push(key);
    return fetch(HF_COUNTER.base + "/hit/" + HF_COUNTER.ns + "/" + key, { mode: "cors", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });   // never blocks or breaks the app
  }
  window.HFCounter = { count: count, counted: counted, config: HF_COUNTER, namespace: HF_COUNTER.ns };

  /* ---- gate ---- */
  function el(id) { return document.getElementById(id); }
  function unlocked() { return !HF_GATE_ENABLED || store.get(HF_UNLOCK_KEY) === HF_CODE_HASH; }
  var waiting = [];
  function open() { document.body.classList.remove("locked"); var g = el("gate"); if (g) g.hidden = true; var cbs = waiting.splice(0); cbs.forEach(function (cb) { cb(); }); }
  function show() {
    var g = el("gate"); if (!g) return;
    g.hidden = false; el("gate-app").textContent = APP.name;
    var form = el("gate-form"), input = el("gate-code"), err = el("gate-err");
    form.onsubmit = function (e) {
      e.preventDefault();
      if (hashCode(input.value) === HF_CODE_HASH) { store.set(HF_UNLOCK_KEY, HF_CODE_HASH); count("unlocks"); open(); }
      else { err.hidden = false; err.textContent = "Hmm, that code didn't match. Check it with Clint and try again (it's not case-sensitive)."; input.select(); }
    };
    input.oninput = function () { err.hidden = true; };
    setTimeout(function () { input.focus(); }, 60);
  }
  window.HFGate = {
    whenUnlocked: function (cb) { if (unlocked()) { open(); cb(); } else { waiting.push(cb); show(); } },
    hashCode: hashCode, isUnlocked: unlocked
  };
  count("opens");
})();
