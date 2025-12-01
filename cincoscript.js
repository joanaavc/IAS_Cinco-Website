// ============================================
// CINCO COFFEE - UNIFIED JAVASCRIPT
// ============================================

(function () {
  "use strict";

  // Ensure bcrypt global exists for different builds (some builds attach to dcodeIO.bcrypt)
  if (
    typeof bcrypt === "undefined" &&
    window.dcodeIO &&
    window.dcodeIO.bcrypt
  ) {
    window.bcrypt = window.dcodeIO.bcrypt;
  }

  // ===== Clean, isolated Session Manager (does NOT modify other code/UI) =====
  const SESSION_KEY = "cinco_session_v1";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const MONITOR_INTERVAL_MS = 60 * 1000; // 1 minute
  const ACTIVITY_THROTTLE_MS = 5000; // throttle activity refresh

  const SessionManager = (function () {
    let monitorId = null;
    let lastActivityTs = 0;

    const now = () => Date.now();

    function genToken(len = 32) {
      try {
        const bytes = new Uint8Array(len);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => ("0" + b.toString(16)).slice(-2)).join(
          ""
        );
      } catch {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
      }
    }

    function read() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function write(obj) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(obj));
      } catch {}
    }

    function remove() {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }

    function create(input, opts = {}) {
      const ts = now();

      // normalize input: accept either email string or session-like object
      let userId = null;
      let email = "";
      let token = opts.token || null;

      if (input && typeof input === "object") {
        userId = String(input.userId || input.id || opts.userId || "") || null;
        email =
          typeof input.email === "string" ? input.email : input.name || "";
        token = token || input.token || input.tokenId || null;
      } else {
        email = input || "";
        userId = opts.userId || null;
      }

      const session = {
        userId: userId || null,
        email: String(email || "").toLowerCase(),
        token: token || genToken(32),
        createdAt: ts,
        lastActivity: ts,
        meta: opts.meta || {},
      };

      write(session);
      // lightweight sync signal for other tabs
      try {
        localStorage.setItem(SESSION_KEY + "_updated", String(ts));
      } catch {}
      return session;
    }

    function get() {
      return read();
    }

    function isValid() {
      const s = read();
      if (!s || !s.lastActivity) return false;
      return now() - s.lastActivity <= SESSION_TIMEOUT_MS;
    }

    function refresh() {
      const t = now();
      if (t - lastActivityTs < ACTIVITY_THROTTLE_MS) return false;
      lastActivityTs = t;
      const s = read();
      if (!s) return false;
      s.lastActivity = t;
      write(s);
      try {
        localStorage.setItem(SESSION_KEY + "_updated", String(t));
      } catch {}
      return true;
    }

    function clear() {
      remove();
      try {
        localStorage.setItem(SESSION_KEY + "_cleared", String(now()));
      } catch {}
    }

    function expire(reason = "timeout") {
      clear();
      // Caller can provide a handler: window.onSessionExpired({ reason })
      if (typeof window.onSessionExpired === "function") {
        try {
          window.onSessionExpired({ reason });
        } catch {}
      }
    }

    function checkOnce() {
      const s = read();
      if (!s) return;
      if (now() - s.lastActivity > SESSION_TIMEOUT_MS) {
        expire("inactivity");
      }
    }

    function startMonitor() {
      if (monitorId !== null) return;
      monitorId = setInterval(checkOnce, MONITOR_INTERVAL_MS);
      // immediate check
      checkOnce();
    }

    function stopMonitor() {
      if (monitorId !== null) {
        clearInterval(monitorId);
        monitorId = null;
      }
    }

    function attachActivityListeners() {
      const handler = () => refresh();
      ["click", "mousemove", "keydown", "touchstart"].forEach((ev) =>
        document.addEventListener(ev, handler, { passive: true })
      );
      // keep tabs in sync but do not force UI changes here
      window.addEventListener("storage", (e) => {
        if (!e.key) return;
        if (
          e.key === SESSION_KEY + "_cleared" ||
          e.key === SESSION_KEY + "_updated"
        ) {
          // no direct UI action; users of the API can react to storage events if desired
        }
      });
    }

    return {
      create,
      get,
      isValid,
      refresh,
      clear,
      expire,
      start: startMonitor,
      stop: stopMonitor,
      attachActivityListeners,
    };
  })();
  // expose for debugging/tests (remove in production if you prefer)
  try {
    window.SessionManager = SessionManager;
  } catch (e) {
    console.warn("Could not expose SessionManager", e);
  }

  // Compatibility aliases for older code that expects SessionManager.set / SessionManager.get etc.
  // Do not remove — keeps older modules working (e.g. addToCart)
  SessionManager.set = SessionManager.create;
  SessionManager.get = SessionManager.get; // already exists but ensure alias
  SessionManager.remove = SessionManager.clear;
  // Expose for other scripts that reference SessionManager globally
  try {
    window.SessionManager = SessionManager;
  } catch (e) {}

  // Expose minimal API for other code to call (no forced UI behavior)
  window.createUserSession = (email, opts) =>
    SessionManager.create(email, opts);
  window.getUserSession = () => SessionManager.get();
  window.isUserSessionValid = () => SessionManager.isValid();
  window.refreshUserSession = () => SessionManager.refresh();
  window.clearUserSession = () => SessionManager.clear();

  // Start monitoring and activity hooks without altering UI; callers handle expiration UI
  try {
    SessionManager.attachActivityListeners();
    SessionManager.start();
  } catch (e) {
    console.error("SessionManager init error", e);
  }
  // ===== end Session Manager =====

  // ===== Input validation & sanitization helpers =====
  const MAX_PASSWORD_LENGTH = 72; // bcrypt practical limit

  function stripTags(input) {
    return String(input).replace(/<[^>]*>/g, "");
  }

  function removeControlChars(input) {
    return String(input).replace(/[\u0000-\u001F\u007F]+/g, "");
  }

  function sanitizeInput(raw) {
    if (!raw && raw !== 0) return "";
    let s = String(raw);
    // remove script/style blocks entirely
    s = s.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
    // strip remaining tags
    s = s.replace(/<\/?[^>]+(>|$)/g, "");
    // remove control characters (null, unit separator, etc.)
    s = s.replace(/[\u0000-\u001F\u007F]/g, "");
    // collapse whitespace
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function containsDangerousPatterns(str) {
    if (!str || typeof str !== "string") return false;
    const lower = str.toLowerCase();

    // Check for dangerous HTML/JS patterns
    const patterns = [
      /<script/i, // script tags
      /<iframe/i, // iframe tags
      /<object/i, // object tags
      /<embed/i, // embed tags
      /on\w+\s*=/i, // event handlers (onclick, onerror, etc.)
      /javascript:/i, // javascript: protocol
      /data:text\/html/i, // data: URIs with HTML
      /<style/i, // style tags (can inject CSS)
      /expression\s*\(/i, // IE CSS expressions
      /behavior\s*:/i, // IE behavior
      /binding\s*:/i, // XBL binding
      /import\s+/i, // CSS @import
      // SQL injection patterns
      /(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bEXEC\b)\s*[\(\'\";]/i,
      /--\s*$/i, // SQL comment
      /\/\*.*\*\//i, // SQL multi-line comment
      /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC)/i, // command chaining
    ];

    return patterns.some((p) => p.test(str));
  }

  function validateEmail(raw) {
    const value = sanitizeInput(raw).toLowerCase();
    if (!value) return { ok: false, msg: "Email is required" };
    if (value.length > 254) return { ok: false, msg: "Email too long" };
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) return { ok: false, msg: "Invalid email format" };
    if (containsDangerousPatterns(value))
      return { ok: false, msg: "Invalid characters in email" };
    return { ok: true, value };
  }

  function validatePassword(raw) {
    const value = typeof raw === "string" ? raw : "";
    if (value.length < 8)
      return { ok: false, msg: "Password must be at least 8 characters" };
    if (value.length > MAX_PASSWORD_LENGTH)
      return {
        ok: false,
        msg: `Password must be ≤ ${MAX_PASSWORD_LENGTH} chars`,
      };
    if (containsDangerousPatterns(value))
      return { ok: false, msg: "Password contains disallowed content" };
    return { ok: true, value };
  }

  function validateTextField(
    name,
    raw,
    { required = false, min = 0, max = 1000, pattern = null } = {}
  ) {
    const value = sanitizeInput(raw);
    if (required && !value) return { ok: false, msg: `${name} is required` };
    if (min && value.length < min)
      return { ok: false, msg: `${name} must be at least ${min} chars` };
    if (max && value.length > max)
      return { ok: false, msg: `${name} is too long` };
    if (pattern && !pattern.test(value))
      return { ok: false, msg: `Invalid ${name}` };
    if (containsDangerousPatterns(value))
      return { ok: false, msg: `${name} contains disallowed content` };
    return { ok: true, value };
  }

  function getErrorText(err, fallback = "An error occurred") {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      if (err.msg) return String(err.msg);
      if (err.message) return String(err.message);
    }
    try {
      return String(err);
    } catch {
      return fallback;
    }
  }
  // ===== end helpers =====

  if (window.__CINCO_INIT) return;
  window.__CINCO_INIT = true;

  console.log("✓ Cinco Coffee Script Loaded");

  // ==========================
  // SESSION MANAGER
  // ==========================
  const SessionManagerLegacy = (function () {
    const KEY = "cincoSession";
    function now() {
      return Date.now();
    }

    return {
      set(sessionObj = {}) {
        try {
          sessionObj._ts = now();
          localStorage.setItem(KEY, JSON.stringify(sessionObj));
          return sessionObj;
        } catch (e) {
          console.error("SessionManager.set error:", e);
        }
      },
      get() {
        try {
          const raw = localStorage.getItem(KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.error("SessionManager.get error:", e);
          return null;
        }
      },
      clear() {
        try {
          localStorage.removeItem(KEY);
        } catch (e) {
          console.error("SessionManager.clear error:", e);
        }
      },
      isLoggedIn() {
        const s = this.get();
        return !!(s && s.userId && s.token);
      },
      isValid(maxAgeMs = 1000 * 60 * 60 * 24) {
        try {
          const s = this.get();
          if (!s || !s.token || !s.userId) return false;
          if (!s._ts) return true;
          return now() - s._ts < Number(maxAgeMs);
        } catch (e) {
          console.error("SessionManager.isValid error:", e);
          return false;
        }
      },
    };
  })();

  window.SessionManagerLegacy = SessionManagerLegacy;

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================

  function showNotification(message, duration = 3000, type = "info") {
    try {
      const notif = document.createElement("div");
      notif.className = `notification notification-${type}`;
      notif.setAttribute("role", "alert");
      notif.setAttribute("aria-live", "polite");
      notif.textContent = message;

      notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${
          type === "success"
            ? "#27ae60"
            : type === "error"
            ? "#e74c3c"
            : type === "warning"
            ? "#f39c12"
            : "#3498db"
        };
        color: white;
        padding: 14px 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 100001;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        animation: slideDown 0.3s ease;
      `;

      document.body.appendChild(notif);

      setTimeout(() => {
        notif.style.animation = "slideUp 0.3s ease";
        setTimeout(() => {
          try {
            notif.parentNode.removeChild(notif);
          } catch (e) {}
        }, 300);
      }, duration);
    } catch (err) {
      console.error("showNotification error:", err);
    }
  }

  // ============================================
  // FORM MESSAGE DISPLAY
  // ============================================

  function showFormMessage(target, message, type = "error", autoHideMs = 0) {
    // Normalize message to a string
    const text = getErrorText(message, "");

    // Resolve container: accept id string (formId or formId-message) or Element
    let container = null;
    try {
      if (!target) {
        container = null;
      } else if (typeof target === "string") {
        // prefer exact id-message, then id
        container =
          document.getElementById(target + "-message") ||
          document.getElementById(target) ||
          document.querySelector(`[data-form="${target}"]`);
      } else if (target instanceof Element) {
        container = target;
      }
    } catch (e) {
      container = null;
    }

    // If no container found, show a global notification fallback
    if (!container) {
      console.warn(
        `Form message container not found for target: ${String(
          target
        )} — falling back to toast`
      );
      // map form message types to notification colors/durations
      const duration =
        type === "success" ? 3000 : type === "error" ? 3500 : 3000;
      showNotification(
        text || (type === "success" ? "Done" : "Error"),
        duration,
        type === "error" ? "error" : type === "success" ? "success" : "info"
      );
      return;
    }

    // Render message in container (ensure safe text insertion)
    try {
      container.textContent =
        text || (type === "success" ? "Success" : "Error");
      // maintain base class and add type class
      container.classList.remove("error", "success", "info", "warning");
      container.classList.add("form-message", type);
      container.style.display = "block";
    } catch (e) {
      // fallback to notification on any DOM error
      console.warn("showFormMessage DOM error, falling back to toast:", e);
      showNotification(
        text,
        3000,
        type === "error" ? "error" : type === "success" ? "success" : "info"
      );
      return;
    }

    // Optionally auto-hide after a timeout
    if (autoHideMs && Number(autoHideMs) > 0) {
      try {
        setTimeout(() => {
          try {
            container.style.display = "none";
          } catch (e) {}
        }, Number(autoHideMs));
      } catch (e) {}
    }
  }

  // ============================================
  // AUTH CALLBACKS
  // ============================================

  function onLoginSuccess(userName) {
    try {
      showNotification(`👋 Welcome, ${userName || "user"}!`, 2800, "success");
      if (typeof updateCartCount === "function") updateCartCount();
      if (typeof rebuildCartModal === "function") rebuildCartModal();
    } catch (e) {
      console.error(e);
    }
  }

  function onSignupSuccess(userName) {
    try {
      showNotification(
        `🎉 Welcome to Cinco Coffee, ${userName || "user"}!`,
        2200,
        "success"
      );
      if (typeof updateCartCount === "function") updateCartCount();
    } catch (e) {
      console.error(e);
    }
  }

  function onLogoutSuccess() {
    try {
      showNotification("👋 You've been logged out", 2500, "info");
      SessionManager.clear();
      if (typeof updateCartCount === "function") updateCartCount();
      if (typeof rebuildCartModal === "function") rebuildCartModal();
    } catch (e) {
      console.error(e);
    }
  }

  function onCheckoutStart() {
    showNotification("📦 Processing your order...", 2000, "info");
  }

  function onCheckoutSuccess(orderId) {
    showNotification(
      `✅ Order placed${orderId ? " — " + orderId : ""}`,
      3500, // ← INCREASE from 3000 to 3500 so it stays longer
      "success"
    );
    try {
      localStorage.removeItem("cincoCart");
    } catch (e) {}
    if (typeof updateCartCount === "function") updateCartCount();
    if (typeof rebuildCartModal === "function") rebuildCartModal();
  }

  function onCheckoutError(msg) {
    showNotification(`❌ Checkout failed: ${msg || "Error"}`, 3000, "error");
  }

  // ===== reCAPTCHA + Login rate-limit helpers (MOVED OUTSIDE initAuthForms) =====
  const RECAPTCHA_SITE_KEY = window.__RECAPTCHA_SITE_KEY || ""; // set this in your HTML before this script
  const LOGIN_ATTEMPTS_KEY = "cinco_login_attempts_v2";
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  function _readLoginAttempts() {
    try {
      return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function _writeLoginAttempts(obj) {
    try {
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function getLoginStatus(email) {
    const key = !email ? "" : String(email).trim().toLowerCase();
    if (!key) return { attempts: 0, lockedUntil: 0 };
    const map = _readLoginAttempts();
    const entry = map[key] || {
      attempts: 0,
      firstTs: 0,
      lastTs: 0,
      lockedUntil: 0,
    };
    return entry;
  }

  function recordFailedLogin(email) {
    const key = !email ? "" : String(email).trim().toLowerCase();
    if (!key) return;
    const map = _readLoginAttempts();
    const nowTs = Date.now();
    const entry = map[key] || {
      attempts: 0,
      firstTs: nowTs,
      lastTs: nowTs,
      lockedUntil: 0,
    };
    entry.attempts = (entry.attempts || 0) + 1;
    entry.lastTs = nowTs;
    if (!entry.firstTs) entry.firstTs = nowTs;
    if (entry.attempts >= MAX_LOGIN_ATTEMPTS) {
      entry.lockedUntil = nowTs + LOCKOUT_MS;
    }
    map[key] = entry;
    _writeLoginAttempts(map);

    return entry;
  }

  function resetLoginAttempts(email) {
    const key = !email ? "" : String(email).trim().toLowerCase();
    if (!key) return;
    const map = _readLoginAttempts();
    if (map[key]) {
      delete map[key];
      _writeLoginAttempts(map);
    }
  }

  function isLocked(email) {
    const entry = getLoginStatus(email);
    if (!entry || !entry.lockedUntil)
      return { locked: false, remaining: 0, attempts: entry.attempts || 0 };
    const nowTs = Date.now();
    if (nowTs < entry.lockedUntil) {
      return {
        locked: true,
        remaining: entry.lockedUntil - nowTs,
        attempts: entry.attempts || 0,
      };
    } else {
      // unlock automatically after expiry
      resetLoginAttempts(email);
      return { locked: false, remaining: 0, attempts: 0 };
    }
  }

  // Load grecaptcha script dynamically and expose execution helper
  function loadRecaptchaScript() {
    return new Promise((resolve) => {
      if (!RECAPTCHA_SITE_KEY) return resolve(null);
      if (window.grecaptcha && window.grecaptcha.execute) {
        // already loaded
        return window.grecaptcha.ready
          ? window.grecaptcha.ready(() => resolve(window.grecaptcha))
          : resolve(window.grecaptcha);
      }
      if (document.querySelector("script[data-cinco-recaptcha]")) {
        // script already injected, wait a bit
        const wait = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.execute) {
            clearInterval(wait);
            window.grecaptcha.ready
              ? window.grecaptcha.ready(() => resolve(window.grecaptcha))
              : resolve(window.grecaptcha);
          }
        }, 150);
        // safety timeout
        setTimeout(() => {
          clearInterval(wait);
          resolve(window.grecaptcha || null);
        }, 7000);
        return;
      }
      const s = document.createElement("script");
      s.setAttribute("data-cinco-recaptcha", "1");
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
        RECAPTCHA_SITE_KEY
      )}`;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        // grecaptcha might not be immediately ready
        if (window.grecaptcha && window.grecaptcha.execute) {
          window.grecaptcha.ready
            ? window.grecaptcha.ready(() => resolve(window.grecaptcha))
            : resolve(window.grecaptcha);
        } else {
          setTimeout(() => resolve(window.grecaptcha || null), 300);
        }
      };
      s.onerror = () => resolve(window.grecaptcha || null);
      document.head.appendChild(s);
    });
  }

  function executeRecaptcha(action = "login") {
    return new Promise((resolve) => {
      if (!RECAPTCHA_SITE_KEY) return resolve(null);
      loadRecaptchaScript().then((gre) => {
        if (!gre || !gre.execute) return resolve(null);
        try {
          gre
            .execute(RECAPTCHA_SITE_KEY, { action })
            .then((token) => {
              resolve(token || null);
            })
            .catch(() => resolve(null));
        } catch (e) {
          // older callback style
          try {
            gre.execute(RECAPTCHA_SITE_KEY, { action: action }, (token) =>
              resolve(token || null)
            );
          } catch (err) {
            resolve(null);
          }
        }
      });
    });
  }
  // ===== end reCAPTCHA + rate-limit helpers =====

  // ============================================
  // LOGIN & SIGNUP HANDLERS (MOVED OUTSIDE initAuthForms)
  // ============================================

  function handleLogin(data) {
    if (data.success) {
      const session = {
        userId: data.userId || data.id || data.email,
        name: data.name || data.fullName || data.email,
        email: data.email || "",
        token: data.token || "token_" + Date.now(),
      };

      // ALWAYS save to localStorage first (primary source of truth)
      localStorage.setItem("cincoSession", JSON.stringify(session));

      // ALSO populate SessionManager
      if (
        window.SessionManager &&
        typeof window.SessionManager.create === "function"
      ) {
        // pass session object so SessionManager will store userId, email and meta consistently
        window.SessionManager.create(
          { userId: session.userId, name: session.name, email: session.email },
          { meta: { name: session.name } }
        );
      }

      // Save token separately
      if (data.token) localStorage.setItem("cincoToken", data.token);

      // Update UI
      if (typeof updateUserHeaderUI === "function") updateUserHeaderUI();

      // Fire the standard success hook so the welcome notification is shown
      if (typeof onLoginSuccess === "function") {
        try {
          onLoginSuccess(session.name || session.email);
        } catch (e) {}
      } else {
        // fallback if hook not available
        showNotification(
          `👋 Welcome, ${session.name || "user"}!`,
          2800,
          "success"
        );
        updateCartCount();
        rebuildCartModal();
      }

      console.log("✓ Login successful:", session.userId);

      // Delay redirect slightly so the notification is visible
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
    }
  }

  function handleSignup(formData) {
    // normalize legacy positional args
    if (typeof formData !== "object" || formData === null) {
      const args = Array.prototype.slice.call(arguments);
      formData = {
        fullName: args[0] || "",
        email: args[1] || "",
        password: args[2] || "",
        confirmPassword: args[3] || "",
      };
    }

    try {
      // basic helpers assumed present: sanitizeInput, validateEmail, validatePassword, validateTextField, getErrorText
      const nameRes = validateTextField("Full name", formData.fullName, {
        required: true,
        min: 2,
        max: 100,
      });
      if (!nameRes.ok) {
        showFormMessage(
          "signupForm",
          getErrorText(nameRes, "Invalid name"),
          "error"
        );
        return;
      }

      const emailRes = validateEmail(formData.email);
      if (!emailRes.ok) {
        showFormMessage(
          "signupForm",
          getErrorText(emailRes, "Invalid email"),
          "error"
        );
        return;
      }

      const passRes = validatePassword(formData.password);
      if (!passRes.ok) {
        showFormMessage(
          "signupForm",
          getErrorText(passRes, "Invalid password"),
          "error"
        );
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        showFormMessage("signupForm", "Passwords do not match", "error");
        return;
      }

      const users = JSON.parse(localStorage.getItem("cincoUsers")) || [];
      const sanitizedEmail = sanitizeInput(emailRes.value || formData.email);
      if (users.find((u) => u.email === sanitizedEmail)) {
        showFormMessage("signupForm", "❌ Email already registered", "error");
        return;
      }

      // NEW: hash the password before storing
      const SALT_ROUNDS = 10;
      bcrypt.hash(formData.password, SALT_ROUNDS, function (err, hashed) {
        if (err) {
          console.error("Bcrypt hash error:", err);
          showFormMessage("signupForm", "❌ Error creating account", "error");
          return;
        }

        const newUser = {
          id: "u_" + Date.now(),
          name: sanitizeInput(formData.fullName),
          email: sanitizeInput(formData.email),
          password: hashed, // store hashed password only
        };

        users.push(newUser);
        localStorage.setItem("cincoUsers", JSON.stringify(users));

        const session = {
          userId: newUser.id,
          name: newUser.name,
          email: newUser.email,
          token: "token_" + Date.now(),
        };
        localStorage.setItem("cincoSession", JSON.stringify(session));

        if (typeof updateUserHeaderUI === "function") updateUserHeaderUI();
        if (typeof onSignupSuccess === "function")
          onSignupSuccess(newUser.name);

        console.log("✓ Signup successful:", session.userId);

        setTimeout(() => {
          window.location.href = "index.html";
        }, 900);
      });
    } catch (error) {
      console.error("Signup error:", error);
      // ensure string message passed
      showFormMessage(
        "signupForm",
        getErrorText(error, "Signup failed"),
        "error"
      );
    }
  }

  // ============================================
  // INITIALIZE AUTH FORMS
  // ============================================
  function initAuthForms() {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if (!loginForm && !signupForm) {
      console.log("ℹ Auth forms not found (expected only on logSign.html)");
      return;
    }

    console.log("✓ Initializing auth forms");

    if (tabLogin) {
      // Ensure tab is focusable and clickable even if CSS/overlays interfere
      tabLogin.setAttribute("role", tabLogin.getAttribute("role") || "tab");
      if (!tabLogin.hasAttribute("tabindex"))
        tabLogin.setAttribute("tabindex", "0");
      tabLogin.style.pointerEvents = tabLogin.style.pointerEvents || "auto";
      tabLogin.style.cursor = tabLogin.style.cursor || "pointer";

      const activateLoginTab = (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        tabLogin.classList.add("active");
        if (tabSignup) tabSignup.classList.remove("active");
        if (loginForm) loginForm.classList.add("active");
        if (signupForm) signupForm.classList.remove("active");
      };

      tabLogin.addEventListener("click", activateLoginTab);
      tabLogin.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateLoginTab(e);
        }
      });
    }

    if (tabSignup) {
      // Ensure tab is focusable and clickable even if CSS/overlays interfere
      tabSignup.setAttribute("role", tabSignup.getAttribute("role") || "tab");
      if (!tabSignup.hasAttribute("tabindex"))
        tabSignup.setAttribute("tabindex", "0");
      tabSignup.style.pointerEvents = tabSignup.style.pointerEvents || "auto";
      tabSignup.style.cursor = tabSignup.style.cursor || "pointer";

      const activateSignupTab = (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        tabSignup.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        if (signupForm) signupForm.classList.add("active");
        if (loginForm) loginForm.classList.remove("active");
      };

      tabSignup.addEventListener("click", activateSignupTab);
      tabSignup.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateSignupTab(e);
        }
      });
    }

    document.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const input = e.currentTarget.parentElement.querySelector("input");
        if (input) {
          const isPassword = input.type === "password";
          input.type = isPassword ? "text" : "password";
          const icon = e.currentTarget.querySelector("i");
          if (icon) {
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
          }
        }
      });
    });

    if (loginForm) {
      // Replace the current login submit binding with this robust handler
      (function bindLoginForm() {
        const form = document.getElementById("loginForm");
        if (!form) {
          console.warn("loginForm not found on page.");
          return;
        }

        form.addEventListener("submit", (e) => {
          e.preventDefault();

          const fd = new FormData(form);
          const payload = Object.fromEntries(fd.entries());

          console.log("=== LOGIN ===");
          console.log("Attempt:", payload);

          const email = (payload.email || "").trim().toLowerCase();

          if (!payload.email || !payload.password) {
            alert("Please enter both email and password.");
            return;
          }

          // Check local lockout first
          const lock = isLocked(email);
          if (lock.locked) {
            const mins = Math.ceil(lock.remaining / 60000);
            showFormMessage(
              "login-message",
              `❌ Too many failed attempts (5). Try again in ${mins} minute(s).`,
              "error"
            );
            return;
          }

          // Run reCAPTCHA v3 token generation (optional server verify if provided)
          executeRecaptcha("login")
            .then((token) => {
              // If you provide a server-side verifier, it should be exposed as:
              // window.verifyRecaptchaToken(token, action) -> Promise<{ ok: true, score: 0.9 } | { ok: false }>
              if (token && typeof window.verifyRecaptchaToken === "function") {
                return window
                  .verifyRecaptchaToken(token, "login")
                  .catch(() => ({ ok: false }));
              }
              // no server verification available — proceed but still include token (best-effort)
              return { ok: true, note: "no-server-verify", token };
            })
            .then((recapResult) => {
              if (recapResult && recapResult.ok === false) {
                // server says bot or invalid token
                recordFailedLogin(email);
                showFormMessage(
                  "loginForm",
                  "❌ reCAPTCHA verification failed. Try again later.",
                  "error"
                );
                return;
              }
              // Optionally check score if returned by server verify
              if (
                recapResult &&
                typeof recapResult.score === "number" &&
                recapResult.score < 0.4
              ) {
                recordFailedLogin(email);
                showFormMessage(
                  "loginForm",
                  "❌ reCAPTCHA suspicious activity detected. Try again later.",
                  "error"
                );
                return;
              }

              // Proceed with local user check & bcrypt compare
              (function sendLogin(payload) {
                try {
                  // Validate email format
                  if (containsDangerousPatterns(payload.email)) {
                    showFormMessage(
                      "loginForm",
                      "❌ Invalid email format detected",
                      "error"
                    );
                    return;
                  }

                  const emailRes = validateEmail(payload.email);
                  if (!emailRes.ok) {
                    showFormMessage(
                      "loginForm",
                      emailRes.msg || "Invalid email",
                      "error"
                    );
                    return;
                  }

                  // Validate password doesn't contain dangerous patterns
                  if (containsDangerousPatterns(payload.password)) {
                    showFormMessage(
                      "loginForm",
                      "❌ Invalid password format detected",
                      "error"
                    );
                    return;
                  }

                  const users = JSON.parse(
                    localStorage.getItem("cincoUsers") || "[]"
                  );
                  const user = users.find((u) => u.email === payload.email);

                  if (!user) {
                    showFormMessage(
                      "loginForm",
                      "❌ Email or password incorrect",
                      "error"
                    );
                    recordFailedLogin(payload.email);
                    return;
                  }

                  // Compare password with bcrypt hash
                  if (
                    window.bcrypt &&
                    typeof window.bcrypt.compareSync === "function"
                  ) {
                    const isMatch = window.bcrypt.compareSync(
                      payload.password,
                      user.password || ""
                    );
                    if (!isMatch) {
                      showFormMessage(
                        "loginForm",
                        "❌ Email or password incorrect",
                        "error"
                      );
                      recordFailedLogin(payload.email);
                      return;
                    }
                  } else {
                    console.warn(
                      "bcrypt not available for password comparison"
                    );
                  }

                  // Login success
                  resetLoginAttempts(payload.email);
                  const session = {
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    token: "token_" + Date.now(),
                  };
                  localStorage.setItem("cincoSession", JSON.stringify(session));

                  // Update UI
                  if (typeof updateUserHeaderUI === "function")
                    updateUserHeaderUI();

                  showFormMessage(
                    "loginForm",
                    "✅ Login successful!",
                    "success",
                    1500
                  );
                  console.log("✓ User logged in:", session.userId);

                  setTimeout(() => {
                    window.location.href = "index.html";
                  }, 800);
                } catch (error) {
                  console.error("Login error:", error);
                  showFormMessage(
                    "loginForm",
                    getErrorText(error, "Login failed"),
                    "error"
                  );
                }
              })(payload);
            })
            .catch((err) => {
              console.error("recaptcha/login flow error:", err);
              // allow login attempt to continue even if recaptcha script failed — rely on rate limiting
              const users =
                JSON.parse(localStorage.getItem("cincoUsers")) || [];
              const user = users.find((u) => u.email === payload.email);
              if (!user) {
                const entry = recordFailedLogin(email);
                const attemptsLeft = Math.max(
                  0,
                  MAX_LOGIN_ATTEMPTS - (entry.attempts || 1)
                );
                showFormMessage(
                  "loginForm",
                  `❌ Email or password incorrect. ${attemptsLeft} attempt(s) left.`,
                  "error"
                );
                return;
              }
              // fallback bcrypt compare
              bcrypt.compare(
                payload.password,
                user.password,
                function (err, isMatch) {
                  if (err || !isMatch) {
                    const entry = recordFailedLogin(email);
                    const attemptsLeft = Math.max(
                      0,
                      MAX_LOGIN_ATTEMPTS - (entry.attempts || 1)
                    );
                    showFormMessage(
                      "loginForm",
                      `❌ Email or password incorrect. ${attemptsLeft} attempt(s) left.`,
                      "error"
                    );
                    return;
                  }
                  resetLoginAttempts(email);
                  handleLogin({
                    success: true,
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    token: "token_" + Date.now(),
                  });
                }
              );
            });
        });
      })();
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name =
          signupForm.querySelector("#signupName")?.value?.trim() || "";
        const email =
          signupForm.querySelector("#signupEmail")?.value?.trim() || "";
        const password =
          signupForm.querySelector("#signupPassword")?.value || "";
        const confirmPassword =
          signupForm.querySelector("#signupConfirm")?.value || "";

        const btn = signupForm.querySelector(".auth-btn");
        if (btn) {
          btn.disabled = true;
          const span = btn.querySelector("span");
          const spinner = btn.querySelector("i");
          if (span) span.style.display = "none";
          if (spinner) spinner.style.display = "inline";
        }

        setTimeout(() => {
          handleSignup(name, email, password, confirmPassword, signupForm);
          if (btn) {
            btn.disabled = false;
            const span = btn.querySelector("span");
            const spinner = btn.querySelector("i");
            if (span) span.style.display = "inline";
            if (spinner) spinner.style.display = "none";
          }
        }, 300);
      });
    }
  }

  // Initialize auth tab UI (login / signup) — works with markup using .auth-tab and .auth-form
  function initAuthTabs() {
    try {
      const tabs = Array.from(document.querySelectorAll(".auth-tab"));
      const panels = Array.from(document.querySelectorAll(".auth-form"));

      if (!tabs.length || !panels.length) return;

      function showPanelById(panelId) {
        panels.forEach((p) => {
          const matches =
            p.id === panelId || p.getAttribute("aria-labelledby") === panelId;
          p.classList.toggle("active", matches);
          p.setAttribute("aria-hidden", matches ? "false" : "true");
        });
        tabs.forEach((t) => {
          const target = t.getAttribute("aria-controls");
          const sel = target === panelId || t.id === panelId;
          t.classList.toggle("active", sel);
          t.setAttribute("aria-selected", sel ? "true" : "false");
        });
        // focus first input in active panel
        const active = document.querySelector(".auth-form.active");
        if (active) {
          const first = active.querySelector("input,button,textarea,select");
          first && first.focus();
        }
      }

      tabs.forEach((tab) => {
        // ensure sensible attributes
        tab.setAttribute("role", tab.getAttribute("role") || "tab");
        tab.setAttribute("tabindex", tab.getAttribute("tabindex") || "0");
        const target = tab.getAttribute("aria-controls");
        if (!target) return;

        tab.addEventListener("click", (e) => {
          e.preventDefault();
          showPanelById(target);
        });
        tab.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showPanelById(target);
          }
          // left/right arrow navigation (optional)
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            const idx = tabs.indexOf(tab);
            const next =
              e.key === "ArrowRight"
                ? (idx + 1) % tabs.length
                : (idx - 1 + tabs.length) % tabs.length;
            tabs[next] && tabs[next].focus();
          }
        });
      });

      // initial activation: the tab with class "active", aria-selected="true" or first tab
      const initialTab =
        tabs.find(
          (t) =>
            t.classList.contains("active") ||
            t.getAttribute("aria-selected") === "true"
        ) || tabs[0];
      if (initialTab) {
        const tgt = initialTab.getAttribute("aria-controls");
        showPanelById(tgt || initialTab.id);
      }
    } catch (err) {
      console.error("initAuthTabs error:", err);
    }
  }

  // ============================================
  // FEEDBACK FORM (contact.html)
  // ============================================
  function initFeedbackForm() {
    try {
      const form = document.getElementById("feedbackForm");
      const successEl = document.getElementById("feedbackSuccess");
      if (!form) return;
      if (successEl) successEl.style.display = "none";
      if (form.__cincoBound) return;
      form.__cincoBound = true;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        // Read raw values
        const rawName = (
          form.querySelector("#feedbackName")?.value || ""
        ).trim();
        const rawEmail = (
          form.querySelector("#feedbackEmail")?.value || ""
        ).trim();
        const rawSubject = (
          form.querySelector("#feedbackSubject")?.value || ""
        ).trim();
        const rawMessage = (
          form.querySelector("#feedbackMessage")?.value || ""
        ).trim();

        // Check required fields first (before sanitizing)
        if (!rawName || !rawEmail || !rawSubject || !rawMessage) {
          showNotification(
            "❌ Please fill in all feedback fields",
            2500,
            "error"
          );
          return;
        }

        // SANITIZE before storing

        const name = sanitizeInput(rawName);
        const email = sanitizeInput(rawEmail);
        const subject = sanitizeInput(rawSubject);
        const message = sanitizeInput(rawMessage);

        const btn = form.querySelector(".feedback-submit-btn");
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Submitting...";
        }

        // save feedback locally (for demo / proof of submission)
        try {
          const list = JSON.parse(
            localStorage.getItem("cincoFeedbacks") || "[]"
          );
          list.push({
            id: "fb_" + Date.now(),
            // NOW sanitized
            name: name,
            // NOW sanitized
            email: email,
            // NOW sanitized
            subject: subject,
            // NOW sanitized
            message: message,
            ts: Date.now(),
          });
          localStorage.setItem("cincoFeedbacks", JSON.stringify(list));
        } catch (err) {
          console.error("Saving feedback error:", err);
        }

        // show success message element (exists in contact.html)
        if (successEl) {
          successEl.style.display = "block";
        } else {
          showNotification(
            "✅ Thank you! Your feedback has been received.",
            3000,
            "success"
          );
        }

        // reset form and re-enable button
        form.reset();
        if (btn) {
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = "Submit Feedback";
          }, 800);
        }

        // hide success message after a short delay so user sees it
        if (successEl) {
          setTimeout(() => {
            try {
              successEl.style.display = "none";
            } catch (e) {}
          }, 4000);
        }
      });
    } catch (err) {
      console.error("initFeedbackForm error:", err);
    }
  }

  // ============================================
  // CART FUNCTIONS
  // ============================================

  function isUserLoggedIn() {
    try {
      // Primary: Check localStorage session
      const session = JSON.parse(localStorage.getItem("cincoSession"));
      if (session && session.userId) {
        return true;
      }

      // Fallback: Check SessionManager
      if (
        typeof SessionManager !== "undefined" &&
        typeof SessionManager.isValid === "function"
      ) {
        return SessionManager.isValid();
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function addToCart(item) {
    try {
      // Restore session from localStorage or SessionManager
      let session = null;
      try {
        const raw = localStorage.getItem("cincoSession");
        if (raw) session = JSON.parse(raw);
      } catch (e) {}

      if (
        !session &&
        window.SessionManager &&
        typeof window.SessionManager.get === "function"
      ) {
        try {
          session = window.SessionManager.get();
        } catch (e) {}
      }

      // REQUIRE login — no guest sessions
      if (!session || !session.userId) {
        showNotification(
          "Please log in first to add items to cart",
          2500,
          "warning"
        );
        setTimeout(() => {
          window.location.href = "logSign.html";
        }, 600);
        return;
      }

      if (typeof item === "string")
        item = { id: item, name: item, price: 0, qty: 1 };
      if (!item || !item.id) {
        console.warn("Invalid item:", item);
        return;
      }

      item.qty = item.qty || 1;
      item.price = Number(item.price) || 0;
      item.name = item.name || item.id;

      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};
      const userCart = allCarts[session.userId] || [];

      const existing = userCart.find((p) => p.id === item.id);
      if (existing) {
        existing.qty += item.qty;
        showNotification(
          `✅ ${item.name} quantity updated in cart`,
          1500,
          "success"
        );
      } else {
        userCart.push(item);
        showNotification(`✅ ${item.name} added to cart!`, 1500, "success");
      }

      allCarts[session.userId] = userCart;
      localStorage.setItem("cincoCart", JSON.stringify(allCarts));

      updateCartCount();

      setTimeout(() => {
        rebuildCartModal();
      }, 100);
    } catch (err) {
      console.error("addToCart error:", err);
      showNotification("❌ Error adding item to cart", 2000, "error");
    }
  }

  function updateCartCount() {
    try {
      // Skip cart count update on checkout page
      if (window.location.pathname.includes("checkout")) {
        return;
      }

      // Restore from localStorage FIRST
      let session = null;
      try {
        const raw = localStorage.getItem("cincoSession");
        if (raw) {
          session = JSON.parse(raw);
          console.log(
            "✓ Cart: Restored session from localStorage:",
            session.userId
          );
        }
      } catch (e) {
        console.warn("Could not parse localStorage session:", e);
      }

      // Only fallback to SessionManager if localStorage is empty
      if (!session && typeof SessionManager !== "undefined") {
        try {
          session = SessionManager.get();
          if (session) {
            console.log(
              "✓ Cart: Got session from SessionManager:",
              session.userId
            );
          }
        } catch (e) {}
      }

      const counts = document.querySelectorAll(".cart-count");

      if (!session || !session.userId) {
        counts.forEach((c) => {
          c.textContent = "0";
          c.style.display = "none";
        });
        console.log("✓ Cart count updated: 0 (no session)");
        return;
      }

      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};
      const userCart = allCarts[session.userId] || [];
      const total = userCart.reduce((sum, p) => sum + (p.qty || 0), 0);

      counts.forEach((c) => {
        c.textContent = total;
        if (total > 0) {
          c.style.display = "flex !important";
          c.style.visibility = "visible";
          c.style.opacity = "1";
        } else {
          c.style.display = "none";
        }
      });

      console.log(
        "✓ Cart count updated:",
        total,
        "for userId:",
        session.userId
      );
    } catch (err) {
      console.error("updateCartCount error:", err);
    }
  }

  function rebuildCartModal() {
    try {
      // PRIMARY: Try localStorage first
      let session = null;
      try {
        const raw = localStorage.getItem("cincoSession");
        if (raw) session = JSON.parse(raw);
      } catch (e) {}

      // FALLBACK: Try SessionManager
      if (!session && typeof SessionManager !== "undefined") {
        session = SessionManager.get();
      }

      const modalBody = document.querySelector("#cartModal .cart-items");
      const cartTotal = document.querySelector("#cartModal .cart-total");
      const cartCountBadge = document.querySelectorAll(".cart-count");

      if (!modalBody) return;

      modalBody.innerHTML = "";

      if (!session || !session.userId) {
        modalBody.innerHTML =
          '<p style="padding:20px;text-align:center;color:#666;">Please log in to view cart.</p>';
        if (cartTotal) cartTotal.textContent = "₱0.00";
        cartCountBadge.forEach((c) => {
          c.textContent = "0";
          c.style.display = "none";
        });
        return;
      }

      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};
      const userCart = allCarts[session.userId] || [];

      if (!userCart.length) {
        modalBody.innerHTML =
          '<p style="padding:20px;text-align:center;color:#999;">Your cart is empty.</p>';
        if (cartTotal) cartTotal.textContent = "₱0.00";
        cartCountBadge.forEach((c) => {
          c.textContent = "0";
          c.style.display = "none";
        });
        return;
      }

      let grandTotal = 0;
      let totalQty = 0;

      userCart.forEach((item, idx) => {
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 1);
        const itemTotal = price * qty;
        grandTotal += itemTotal;
        totalQty += qty;

        const imgSrc =
          item.img ||
          item.image ||
          item.dataImg ||
          item.imgSrc ||
          item.thumbnail ||
          item.src ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";

        const itemRow = document.createElement("div");
        itemRow.className = "cart-item";
        itemRow.style.cssText =
          "display:flex; align-items:center; gap:14px; padding:12px 16px; border-bottom:1px solid #f0e8df;";

        itemRow.innerHTML = `
          <div class="cart-item-left" style="display:flex; align-items:center; gap:12px; flex:1;">
            <div class="cart-item-img">
              <img src="${imgSrc}" alt="${(item.name || "Product").replace(
          /"/g,
          ""
        )}" />
            </div>
            <div class="cart-item-details">
              <strong class="cart-item-name">${item.name || "Product"}</strong>
              ${
                item.size
                  ? `<div class="cart-item-size">Size: ${item.size}</div>`
                  : ""
              }
              <div class="cart-item-qty-price" style="margin-top:6px; color:#7a6a62;">Qty: ${qty} × ₱${price.toFixed(
          2
        )}</div>
            </div>
          </div>

          <div class="cart-item-right" style="display:flex; align-items:center; gap:12px; text-align:right;">
            <div style="font-weight:700; min-width:90px;">₱${itemTotal.toFixed(
              2
            )}</div>
            <button class="remove-item-btn" data-idx="${idx}" aria-label="Remove item" style="background:none;border:none;color:#e76b66;cursor:pointer;padding:6px;">
              Remove
            </button>
          </div>
        `;

        modalBody.appendChild(itemRow);
      });

      if (cartTotal) cartTotal.textContent = `₱${grandTotal.toFixed(2)}`;

      cartCountBadge.forEach((c) => {
        c.textContent = totalQty;
        c.style.display = totalQty > 0 ? "flex" : "none";
      });

      modalBody.querySelectorAll(".remove-item-btn").forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          const idx = Number(btn.getAttribute("data-idx"));
          removeFromCart(idx);
        };
      });

      console.log(
        "✓ Cart modal rebuilt with",
        userCart.length,
        "items, total qty:",
        totalQty
      );
    } catch (err) {
      console.error("rebuildCartModal error:", err);
    }
  }

  function removeFromCart(index) {
    try {
      const session = SessionManager.get();
      if (!session || !session.userId) return;

      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};
      const userCart = allCarts[session.userId] || [];

      userCart.splice(index, 1);
      allCarts[session.userId] = userCart;
      localStorage.setItem("cincoCart", JSON.stringify(allCarts));

      showNotification("Item removed from cart", 1000);
      updateCartCount();
      rebuildCartModal();
    } catch (err) {
      console.error("removeFromCart error:", err);
    }
  }

  function updateCartUI() {
    updateCartCount();
    rebuildCartModal();
  }

  // ============================================
  // CART MODAL FUNCTIONS
  // ============================================

  function openCartModal() {
    const modal = document.getElementById("cartModal");
    const overlay = document.querySelector(".overlay");
    const cartBtn = document.querySelector(".cart-btn");

    if (modal) {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      modal.style.display = "flex";
      modal.style.transform = "translateX(0)";
    }
    if (overlay) {
      overlay.classList.add("active");
      overlay.style.display = "block";
      overlay.style.pointerEvents = "auto";
      overlay.style.opacity = "1";
    }
    if (cartBtn) {
      cartBtn.classList.add("behind-modal");
      cartBtn.style.zIndex = "800";
      cartBtn.style.pointerEvents = "none";
      cartBtn.style.opacity = "0";
    }

    console.log("✓ Cart modal opened");
  }

  function closeCartModal() {
    const modal = document.getElementById("cartModal");
    const overlay = document.querySelector(".overlay");
    const cartBtn = document.querySelector(".cart-btn");

    if (modal) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      modal.style.transform = "translateX(100%)";
    }
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.pointerEvents = "none";
      overlay.style.opacity = "0";
    }
    if (cartBtn) {
      cartBtn.classList.remove("behind-modal");
      cartBtn.style.zIndex = "";
      cartBtn.style.pointerEvents = "";
      cartBtn.style.opacity = "";
    }

    setTimeout(() => {
      try {
        if (modal) modal.style.display = "none";
        if (overlay) overlay.style.display = "none";
      } catch (e) {}
    }, 320);

    console.log("✓ Cart modal closed");
  }

  // ============================================
  // BIND PRODUCT BUTTONS
  // ============================================

  function bindProductButtons() {
    console.log("✓ Binding product buttons...");

    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.style.pointerEvents = "none";
    }

    document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      if (btn.__cincoBound) return;
      btn.__cincoBound = true;
      btn.style.pointerEvents = "auto";
      btn.style.cursor = "pointer";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const name =
          btn.getAttribute("data-name") || btn.textContent.trim() || "Product";
        const price = parseFloat(btn.getAttribute("data-price")) || 0;
        const size = btn.getAttribute("data-size") || "Standard";
        const img = btn.getAttribute("data-img") || "assets/default.png";

        const id = `${name.replace(/\s+/g, "-")}-${size}`;

        const item = { id, name, price, qty: 1, size, img };
        console.log("Adding item:", item);
        addToCart(item);
      });
    });

    const cartBtn = document.querySelector(".cart-btn");
    if (cartBtn) {
      cartBtn.style.pointerEvents = "auto";
      cartBtn.style.cursor = "pointer";
      if (!cartBtn.__cincoCartBound) {
        cartBtn.__cincoCartBound = true;
        cartBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isUserLoggedIn()) {
            showNotification("Please log in first", 2500);
            setTimeout(() => (window.location.href = "logSign.html"), 600);
            return;
          }
          openCartModal();
          rebuildCartModal();
        });
      }
    }

    const closeBtn = document.querySelector(".close-cart");
    if (closeBtn && !closeBtn.__cincoBound) {
      closeBtn.__cincoBound = true;
      closeBtn.addEventListener("click", closeCartModal);
    }

    if (overlay && !overlay.__cincoClickBound) {
      overlay.__cincoClickBound = true;
      overlay.addEventListener("click", closeCartModal);
    }

    console.log("✓ Product buttons bound successfully");
  }

  // ============================================
  // LOGOUT HANDLER
  // ============================================

  function bindLogoutButton() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    if (logoutBtn.__cincoBound) return;
    logoutBtn.__cincoBound = true;

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Clear session
      try {
        localStorage.removeItem("cincoSession");
        localStorage.removeItem("cincoCart");
        if (
          window.SessionManager &&
          typeof window.SessionManager.clear === "function"
        ) {
          window.SessionManager.clear();
        }
      } catch (err) {}

      console.log("✓ User logged out");
      showNotification("👋 Logged out successfully", 2000, "info");

      // Update UI
      updateUserHeaderUI();
      updateCartCount();

      // Redirect to home
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    });
  }

  // ============================================
  // CHECKOUT BUTTON
  // ============================================

  function bindCheckoutButton() {
    const btn = document.querySelector(".checkout-btn");
    if (!btn) return;
    if (btn.__cincoBound) return;
    btn.__cincoBound = true;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isUserLoggedIn()) {
        showNotification("Please log in to checkout", 2500, "warning");
        setTimeout(() => (window.location.href = "logSign.html"), 800);
        return;
      }

      // DO NOT check/alert cart emptiness here — handle it on checkout page
      closeCartModal();
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 200);
    });
  }

  // ============================================
  // CHECKOUT FORM
  // ============================================

  function bindCheckoutForm() {
    const restoreSession = () => {
      try {
        const raw = localStorage.getItem("cincoSession");
        if (
          raw &&
          window.SessionManager &&
          typeof window.SessionManager.set === "function"
        ) {
          const session = JSON.parse(raw);
          window.SessionManager.set(session);
        }
      } catch (e) {
        console.warn("Could not restore session:", e);
      }
    };

    restoreSession();

    const attachBindings = (form) => {
      if (!form) return;
      if (form.dataset.cincoBound === "1") {
        console.log("✓ Checkout form already bound.");
        return;
      }
      console.log("✓ Checkout form found — binding.");
      form.dataset.cincoBound = "1";

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (typeof window.handleCheckoutSubmit === "function") {
          return window.handleCheckoutSubmit(e);
        }

        const successModal = document.getElementById("orderSuccessModal");
        const orderNumberEl = document.getElementById("orderNumber");
        const raw = localStorage.getItem("cincoCart");
        const allCarts = raw ? JSON.parse(raw) : {};
        const session =
          window.SessionManager &&
          typeof window.SessionManager.get === "function"
            ? window.SessionManager.get()
            : JSON.parse(localStorage.getItem("cincoSession") || "{}");

        const userId = session && session.userId ? session.userId : null;
        const userCart = userId ? allCarts[userId] || [] : [];

        if (!userCart || userCart.length === 0) {
          showNotification(
            "Your cart is empty. Please add items before placing an order.",
            3000,
            "warning"
          );
          return;
        }

        const orderNum = Math.floor(100000 + Math.random() * 900000).toString();

        if (orderNumberEl) orderNumberEl.textContent = orderNum;

        if (successModal) {
          successModal.style.zIndex = "100000";
          successModal.style.position = "fixed";
          successModal.style.top = "0";
          successModal.style.left = "0";
          successModal.style.width = "100%";
          successModal.style.height = "100%";
          successModal.style.display = "flex";
          successModal.style.alignItems = "center";
          successModal.style.justifyContent = "center";
          successModal.style.backgroundColor = "rgba(0,0,0,0.5)";
          successModal.classList.add("active");
        }

        if (userId) {
          delete allCarts[userId];
          localStorage.setItem("cincoCart", JSON.stringify(allCarts));
          updateCartCount();
        }

        showNotification(
          `✅ Order #${orderNum} placed successfully!`,
          2000,
          "success"
        );

        setTimeout(() => {
          if (successModal) {
            successModal.style.display = "none";
            successModal.classList.remove("active");
          }
          window.location.href = "productupdate.html";
        }, 2500);
      });
    };

    const tryImmediate = () => {
      const f = document.getElementById("checkoutForm");
      if (f) {
        attachBindings(f);
        return true;
      }
      return false;
    };

    if (!tryImmediate()) {
      console.log(
        "bindCheckoutForm: form not present yet; document.readyState=",
        document.readyState
      );

      const startObserve = () => {
        const root = document.documentElement || document.body;
        if (!root) {
          setTimeout(startObserve, 150);
          return;
        }

        let observerTimeout = null;
        const observer = new MutationObserver((mutations, obs) => {
          const f = document.getElementById("checkoutForm");
          if (f) {
            attachBindings(f);
            obs.disconnect();
            if (observerTimeout) clearTimeout(observerTimeout);
          }
        });

        observer.observe(root, { childList: true, subtree: true });

        // Increase timeout to 15 seconds for slower-loading pages
        observerTimeout = setTimeout(() => {
          try {
            observer.disconnect();
          } catch (e) {}
          const still = document.getElementById("checkoutForm");
          if (!still) {
            console.warn(
              "Checkout form not found after 15s — observer stopped."
            );
          }
        }, 15000);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startObserve, {
          once: true,
        });
      } else {
        startObserve();
      }
    }
  }

  // ============================================
  // RENDER CHECKOUT CART
  // ============================================

  function renderCheckoutCart() {
    try {
      const container = document.getElementById("checkout-cart");
      if (!container) return;

      container.innerHTML = "";

      const session = SessionManager.get();
      if (!session || !session.userId) {
        container.innerHTML =
          '<p style="color:#666;padding:12px;">Please log in to see your cart items.</p>';
        return;
      }

      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};
      const userCart = allCarts[session.userId] || [];

      if (!userCart.length) {
        container.innerHTML =
          '<p style="color:#666;padding:12px;">Your cart is empty.</p>';
        return;
      }

      const list = document.createElement("div");
      list.className = "checkout-cart-list";
      let grandTotal = 0;

      userCart.forEach((it, i) => {
        const price = Number(it.price || 0);
        const qty = Number(it.qty || 1);
        const itemTotal = price * qty;
        grandTotal += itemTotal;

        const imgSrc = it.img || it.image || "assets/placeholder.png";

        const row = document.createElement("div");
        row.className = "checkout-cart-row";
        row.style.cssText =
          "display:flex; gap:12px; align-items:center; padding:12px; border-bottom:1px solid #f0e8df;";

        row.innerHTML = `
          <div style="width:64px; height:64px; border-radius:8px; overflow:hidden; flex-shrink:0; background:#fff;">
            <img src="${imgSrc}" alt="${(it.name || "Item").replace(
          /"/g,
          ""
        )}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--dark);">${
              it.name || "Product"
            }</div>
            <div style="font-size:12px;color:var(--muted); margin-top:4px;">${
              it.size ? `Size: ${it.size} • ` : ""
            }Qty: ${qty} × ₱${price.toFixed(2)}</div>
          </div>
          <div style="min-width:90px; text-align:right; font-weight:700; color:var(--brand);">₱${itemTotal.toFixed(
            2
          )}</div>
        `;

        list.appendChild(row);
      });

      const footer = document.createElement("div");
      footer.style.cssText =
        "padding:16px; text-align:right; border-top:2px solid #f0e8df; font-weight:800; font-size:16px; color:var(--brand);";
      footer.textContent = `Total: ₱${grandTotal.toFixed(2)}`;

      container.appendChild(list);
      container.appendChild(footer);

      console.log("✓ Checkout cart rendered with", userCart.length, "items");
    } catch (err) {
      console.error("renderCheckoutCart error:", err);
    }
  }

  // ============================================
  // CHECKOUT PAGE INITIALIZER
  // ============================================
  function initCheckoutPage() {
    // DON'T wrap in DOMContentLoaded — just run immediately

    const orderItemsContainer = document.querySelector(".order-items");
    const subtotalEl = document.querySelector(".subtotal-amount");
    const totalEl = document.querySelector(".total-amount");
    const placeBtn = document.querySelector(".place-order-btn");
    const form = document.getElementById("checkoutForm");
    const successModal = document.getElementById("orderSuccessModal");
    const orderNumberEl = document.getElementById("orderNumber");
    const mobileUserGreeting = document.getElementById("mobileUserGreeting");
    const floatingLogout = document.getElementById("floatingLogout");

    // Safety: exit if not on checkout page
    if (!orderItemsContainer) return;

    // RESTORE session from localStorage FIRST
    let session = null;
    try {
      const raw = localStorage.getItem("cincoSession");
      if (raw) {
        session = JSON.parse(raw);
        if (
          window.SessionManager &&
          typeof window.SessionManager.set === "function"
        ) {
          window.SessionManager.set(session);
        }
      }
    } catch (e) {
      console.warn("Could not restore session:", e);
    }

    // Show user greeting if session available
    if (session && session.name && mobileUserGreeting) {
      mobileUserGreeting.textContent = `Hello, ${session.name}`;
      mobileUserGreeting.style.fontWeight = "500";
      if (floatingLogout) floatingLogout.style.display = "";
    }

    function renderCartFromStorage() {
      if (!orderItemsContainer) return;
      orderItemsContainer.innerHTML = "";
      let subtotal = 0;

      // READ cart data
      const raw = localStorage.getItem("cincoCart");
      const allCarts = raw ? JSON.parse(raw) : {};

      // GET current session
      const userId = session ? session.userId : null;
      const userCart = userId ? allCarts[userId] || [] : [];

      console.log(
        "✓ Checkout render - userId:",
        userId,
        "Items in cart:",
        userCart.length
      );

      if (!userCart || userCart.length === 0) {
        orderItemsContainer.innerHTML =
          "<p style='color:#999; padding:20px;'>Your cart is empty.</p>";
        if (subtotalEl) subtotalEl.textContent = "0.00";
        if (totalEl) totalEl.textContent = "50.00";
        return;
      }

      // Render each item
      userCart.forEach((item) => {
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 1);
        const itemTotal = price * qty;
        subtotal += itemTotal;

        const wrapper = document.createElement("div");
        wrapper.className = "order-item";
        wrapper.style.cssText = `
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eee;
          gap: 12px;
        `;
        wrapper.innerHTML = `
          <img src="${item.img || "assets/placeholder.png"}" alt="${
          item.name || ""
        }" 
               style="width:80px; height:80px; object-fit:cover; border-radius:6px;" />
          <div style="flex:1;">
            <div style="font-weight:600; margin-bottom:4px;">${
              item.name || ""
            }</div>
            ${
              item.size
                ? `<div style="font-size:12px; color:#999;">Size: ${item.size}</div>`
                : ""
            }
            <div style="font-size:14px; color:#666;">Qty: ${qty}</div>
          </div>
          <div style="text-align:right; font-weight:600;">
            ₱${itemTotal.toFixed(2)}
          </div>
        `;
        orderItemsContainer.appendChild(wrapper);
      });

      // Update totals
      const deliveryFee = 50;
      const total = subtotal + deliveryFee;
      if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
      if (totalEl) totalEl.textContent = total.toFixed(2);

      console.log(
        "✓ Cart rendered - Subtotal: ₱" +
          subtotal.toFixed(2) +
          ", Total: ₱" +
          total.toFixed(2)
      );
    }

    // Render cart immediately (page is already loaded)
    renderCartFromStorage();

    // Handle place order
    function generateOrderNumber() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const raw = localStorage.getItem("cincoCart");
        const allCarts = raw ? JSON.parse(raw) : {};
        const userId = session ? session.userId : null;
        const userCart = userId ? allCarts[userId] || [] : [];

        if (!userCart || userCart.length === 0) {
          if (typeof showNotification === "function") {
            showNotification(
              "Your cart is empty. Please add items before placing an order.",
              3000,
              "warning"
            );
          }
          return;
        }

        const orderNum = generateOrderNumber();
        if (orderNumberEl) orderNumberEl.textContent = orderNum;
        if (successModal) successModal.style.display = "flex";

        // Clear cart after order
        if (userId) {
          delete allCarts[userId];
          localStorage.setItem("cincoCart", JSON.stringify(allCarts));
          if (typeof updateCartCount === "function") updateCartCount();
        }

        if (typeof showNotification === "function") {
          showNotification(
            `✅ Order #${orderNum} placed successfully!`,
            2000,
            "success"
          );
        }

        setTimeout(() => {
          if (successModal) successModal.style.display = "none";
          window.location.href = "productupdate.html";
        }, 2500);
      });
    }

    if (placeBtn && form) {
      placeBtn.addEventListener("click", () => {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      });
    }
  }

  // ============================================
  // UPDATE USER HEADER UI
  // ============================================
  function updateUserHeaderUI() {
    try {
      const session =
        (typeof SessionManager !== "undefined" &&
          SessionManager.get &&
          SessionManager.get()) ||
        JSON.parse(localStorage.getItem("cincoSession") || "null");

      const nameEl = document.getElementById("userName");
      const logoutBtn = document.getElementById("logoutBtn");

      // Prefer explicit user name fields; do NOT use email as the displayed name.
      const rawName =
        session && (session.name || (session.meta && session.meta.name))
          ? session.name || (session.meta && session.meta.name)
          : "";
      const displayName = sanitizeInput(rawName) || "kaCinco";

      if (session && nameEl) {
        nameEl.textContent = `Hello, ${displayName}`;
        nameEl.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
      } else if (nameEl) {
        nameEl.textContent = "";
        nameEl.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
      }

      // hide/show hero auth link(s)
      document.querySelectorAll(".auth-link").forEach((el) => {
        if (session) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
        } else {
          el.style.visibility = "";
          el.style.pointerEvents = "";
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Fix hero centering when login button hides
  function fixHeroCentering() {
    const heroContent = document.querySelector(".hero-content");
    if (heroContent) {
      heroContent.style.display = "flex";
      heroContent.style.flexDirection = "column";
      heroContent.style.alignItems = "center !important";
      heroContent.style.justifyContent = "center !important";
      heroContent.style.gap = "20px";
    }
  }

  // Call this in init() after updateUserHeaderUI()
  // In your init() function, add:
  try {
    updateUserHeaderUI();
    fixHeroCentering(); // ← ADD THIS
  } catch (e) {
    console.error("updateUserHeaderUI setup error:", e);
  }

  // ============================================
  // MAIN INIT
  // ============================================
  function init() {
    console.log("✓ Initializing Cinco Coffee...");
    try {
      expireSessionIfNeeded();
    } catch (e) {}
    try {
      initAuthForms();
    } catch (e) {
      console.log("ℹ Auth forms not found");
    }
    // Ensure .auth-tab based tab behavior is initialized (used by logSign.html)
    try {
      initAuthTabs();
    } catch (e) {
      console.log("ℹ Auth tabs not initialized");
    }

    // enforce session expiry immediately on load
    try {
      expireSessionIfNeeded();
    } catch (e) {}

    // initialize feedback form (contact.html)
    try {
      initFeedbackForm();
    } catch (e) {
      console.error("initFeedbackForm error:", e);
    }

    // One-time migration: sanitize any previously saved feedbacks in localStorage
    function sanitizeStoredFeedbacks() {
      if (typeof sanitizeInput !== "function") {
        console.warn("sanitizeInput not available");
        return;
      }
      try {
        const raw = localStorage.getItem("cincoFeedbacks") || "[]";
        const list = JSON.parse(raw);
        if (!Array.isArray(list) || list.length === 0) return;
        const cleaned = list.map((f) => ({
          id: f.id || "fb_" + Date.now(),
          name: sanitizeInput(f.name || ""),
          email: sanitizeInput(f.email || ""),
          subject: sanitizeInput(f.subject || ""),
          message: sanitizeInput(f.message || ""),
          ts: f.ts || Date.now(),
        }));
        localStorage.setItem("cincoFeedbacks", JSON.stringify(cleaned));
        console.log("Sanitized feedbacks:", cleaned.length);
      } catch (e) {
        console.error("sanitizeStoredFeedbacks error:", e);
      }
    }

    // Run one-time migration to sanitize any previously saved feedbacks
    try {
      sanitizeStoredFeedbacks();
    } catch (e) {
      console.error("sanitizeStoredFeedbacks error:", e);
    }

    try {
      bindProductButtons();
    } catch (e) {
      console.error("bindProductButtons error:", e);
    }
    try {
      bindLogoutButton();
    } catch (e) {
      console.error("bindLogoutButton error:", e);
    }
    try {
      bindCheckoutButton();
    } catch (e) {
      console.error("bindCheckoutButton error:", e);
    }
    try {
      bindCheckoutForm();
    } catch (e) {
      console.error("bindCheckoutForm error:", e);
    }
    try {
      updateUserHeaderUI(); // ← ADD THIS LINE
    } catch (e) {
      console.error("updateUserHeaderUI error:", e);
    }

    try {
      renderCheckoutCart();
    } catch (e) {
      console.error("renderCheckoutCart error:", e);
    }

    // NEW: initialize checkout page handlers (safe to call on all pages)
    try {
      initCheckoutPage();
    } catch (e) {
      /* ignore */
    }

    // DELAY updateCartCount() to allow session to fully restore
    setTimeout(() => {
      try {
        updateCartCount();
      } catch (e) {
        console.error("updateCartCount error:", e);
      }
    }, 300);

    // DELAY rebuildCartModal() similarly
    setTimeout(() => {
      try {
        rebuildCartModal();
      } catch (e) {
        console.error("rebuildCartModal error:", e);
      }
    }, 400);

    console.log("✓ Initialization complete");
  }

  // Auto-run init(): ensure auth tabs/forms and bindings are initialized
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      // run async so other inline scripts can finish
      setTimeout(init, 0);
    }
  } catch (e) {
    // fallback: ensure init runs
    setTimeout(init, 0);
  }

  // --- session helper: support current and legacy keys ---
  const LEGACY_SESSION_KEYS = ["cinco_session_v1", "cincoSession"];

  function readAnySession() {
    for (const k of LEGACY_SESSION_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) return { key: k, obj: JSON.parse(raw) };
      } catch (e) {}
    }
    return null;
  }

  function removeAllSessions() {
    for (const k of LEGACY_SESSION_KEYS) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    }
  }

  function getSessionTimestamp(session) {
    if (!session) return null;
    return (
      Number(
        session.ts ||
          session.lastActivity ||
          session.createdAt ||
          session.updatedAt ||
          0
      ) || null
    );
  }

  function setSessionTimestampFields(session, value) {
    try {
      session.ts = value;
      session.lastActivity = value;
      if (!session.createdAt) session.createdAt = value;
    } catch (e) {}
    return session;
  }

  // expire check that covers both keys
  function expireSessionIfNeeded(timeoutMs = 30 * 60 * 1000) {
    try {
      const found = readAnySession();
      if (!found) return false;
      const { key, obj } = found;
      const ts = getSessionTimestamp(obj);
      if (!ts) return false;
      if (Date.now() - Number(ts) > Number(timeoutMs)) {
        // remove all possible session keys
        removeAllSessions();
        if (typeof updateUserHeaderUI === "function") updateUserHeaderUI();
        if (typeof showNotification === "function") {
          showNotification(
            "⏳ Session expired due to inactivity. Please log in again.",
            3500,
            "info"
          );
        }
        try {
          // Delay redirect slightly so the notification is visible to the user
          setTimeout(() => {
            try {
              window.location.href = "logSign.html";
            } catch (e) {}
          }, 3000);
        } catch (e) {}
        return true;
      }
    } catch (e) {
      console.error("expireSessionIfNeeded error:", e);
    }
    return false;
  }

  // ensure a debug helper sets the right fields on whichever key exists
  window.expireSessionNow = function (byMs = 31 * 60 * 1000) {
    try {
      const found = readAnySession();
      if (!found) return false;
      const past = Date.now() - byMs;
      const updated = setSessionTimestampFields(found.obj, past);
      localStorage.setItem(found.key, JSON.stringify(updated));
      console.log("expireSessionNow: set", found.key, "ts ->", past);
      return true;
    } catch (e) {
      console.error("expireSessionNow error", e);
      return false;
    }
  };

  // periodic enforcement + cross-tab sync
  (function enableExpiryEnforcement() {
    const CHECK_MS = 60 * 1000;
    setInterval(expireSessionIfNeeded, CHECK_MS);
    window.addEventListener("storage", (e) => {
      if (LEGACY_SESSION_KEYS.includes(e.key)) expireSessionIfNeeded();
    });
  })();
  // ==========================
  // expose expireSessionIfNeeded for debugging
  try {
    window.expireSessionIfNeeded = expireSessionIfNeeded;
  } catch (e) {}

  // ===== EXPOSE RATE LIMITING & reCAPTCHA HELPERS FOR TESTING =====
  try {
    window.getLoginStatus = getLoginStatus;
    window.recordFailedLogin = recordFailedLogin;
    window.resetLoginAttempts = resetLoginAttempts;
    window.isLocked = isLocked;
    window.executeRecaptcha = executeRecaptcha;
    window.loadRecaptchaScript = loadRecaptchaScript;
  } catch (e) {
    console.warn("Could not expose rate-limit/reCAPTCHA helpers:", e);
  }

  // Add this function after your existing cart helpers:

  function verifyCartIntegrity() {
    const cart = JSON.parse(localStorage.getItem("cincoCart") || "[]");

    // Define your legitimate menu prices (source of truth)
    const MENU_PRICES = {
      Americano: 70,
      "Café Latte": 80,
      "Spanish Latte": 90,
      "French Vanilla": 90,
      "White Choco Mocha": 100,
      "Sea Salt Latte": 100,
      "Caramel Macchiato": 100,
      "Milky Ube": 90,
      "Strawberry Milk": 90,
      "Caramel Milk": 90,
      "Matcha Latte": 100,
      "Milky Choco": 100,
    };

    let cartValid = true;
    let tamperedItems = [];

    cart.forEach((item, index) => {
      const legitimatePrice = MENU_PRICES[item.name];

      // Check if price matches or is suspiciously low
      if (
        !legitimatePrice ||
        item.price <= 0 ||
        item.price !== legitimatePrice
      ) {
        cartValid = false;
        tamperedItems.push({
          item: item.name,
          submittedPrice: item.price,
          legitimatePrice: legitimatePrice,
        });
      }
    });

    return {
      isValid: cartValid,
      tamperedItems: tamperedItems,
      cart: cart,
    };
  }

  // Call this BEFORE processing checkout:
  function processCheckout() {
    const verification = verifyCartIntegrity();

    if (!verification.isValid) {
      showNotification(
        "❌ Cart integrity check failed. Prices have been tampered with. Order rejected.",
        5000,
        "error"
      );
      console.warn("🚨 Cart tampering detected:", verification.tamperedItems);
      return false; // REJECT ORDER
    }

    // Proceed with legitimate checkout
    console.log("✅ Cart verified. Proceeding with order...");
    return true;
  }

  // Find your checkout form submit handler and add:
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // ADD THIS CHECK:
      const verification = verifyCartIntegrity();
      if (!verification.isValid) {
        showNotification(
          "❌ Cart has been modified. Please reload and try again.",
          5000,
          "error"
        );
        console.warn("Tampering detected:", verification.tamperedItems);

        // Add to verification function for fraud detection:
        if (!verification.isValid) {
          const fraudLog = {
            timestamp: new Date().toISOString(),
            userId: getCurrentUserId(),
            tamperedItems: verification.tamperedItems,
            userAgent: navigator.userAgent,
          };
          console.error("🚨 FRAUD ALERT:", fraudLog);
          // In production: send this to your backend for review
        }

        return;
      }

      // ...rest of checkout code...
    });
  }
})();
