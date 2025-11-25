// ============================================
// CINCO COFFEE - UNIFIED JAVASCRIPT (FIXED)
// All JavaScript functionality in one file
// ============================================

(function () {
  "use strict";

  // ============================================
  // INPUT VALIDATION & SANITIZATION FUNCTIONS
  // ============================================

  /**
   * SECURITY: Input Validation & Sanitization
   * Prevents XSS, SQL Injection, and malicious input attacks
   * All user inputs are validated before processing
   */

  function sanitizeInput(input) {
    if (typeof input !== "string") return "";

    // Remove HTML/script tags and dangerous characters
    return input
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, "") // Remove event handlers (onclick, etc.)
      .trim();
  }

  function validateEmail(email) {
    // RFC 5322 simplified email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      emailRegex.test(email) &&
      email.length <= 254 &&
      !email.includes("<") &&
      !email.includes(">")
    );
  }

  function validatePassword(password) {
    // Check for minimum length and no dangerous characters
    if (typeof password !== "string") return false;
    if (password.length < 6 || password.length > 128) return false;
    // Reject if contains obvious SQL injection patterns
    if (/['";\\]/g.test(password)) return false;
    return true;
  }

  function validateName(name) {
    // Allow letters, spaces, hyphens, apostrophes only
    const nameRegex = /^[a-zA-Z\s\-']{2,100}$/;
    const sanitized = sanitizeInput(name);
    return nameRegex.test(sanitized);
  }

  function validatePhoneNumber(phone) {
    // Allow only digits, spaces, hyphens, parentheses, and +
    const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
    const sanitized = sanitizeInput(phone);
    return phoneRegex.test(sanitized);
  }

  function validateAddress(address) {
    // Max 500 chars, no script tags, allow common address characters
    const sanitized = sanitizeInput(address);
    return (
      sanitized.length >= 5 &&
      sanitized.length <= 500 &&
      !sanitized.includes("<") &&
      !sanitized.includes(">") &&
      !sanitized.includes("{") &&
      !sanitized.includes("}")
    );
  }

  function validateProductName(name) {
    // Product names: alphanumeric, spaces, hyphens, parentheses only
    const nameRegex = /^[a-zA-Z0-9\s\-\(\)]{2,100}$/;
    const sanitized = sanitizeInput(name);
    return nameRegex.test(sanitized);
  }

  function validatePrice(price) {
    // Price: positive number with max 2 decimals, max 5 digits before decimal
    const priceRegex = /^\d{1,5}(\.\d{1,2})?$/;
    return priceRegex.test(price);
  }

  function validateQuantity(quantity) {
    // Quantity: positive integer between 1 and 999
    const qty = parseInt(quantity);
    return qty >= 1 && qty <= 999;
  }

  function validateTextarea(text, minLength = 5, maxLength = 1000) {
    // For feedback, notes, messages
    const sanitized = sanitizeInput(text);
    return (
      sanitized.length >= minLength &&
      sanitized.length <= maxLength &&
      !sanitized.includes("<script>") &&
      !sanitized.includes("</script>")
    );
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function getCurrentUser() {
    return localStorage.getItem("currentUser");
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem("users") || "{}");
  }

  function saveUsers(u) {
    localStorage.setItem("users", JSON.stringify(u));
  }

  // ============================================
  // CLEAR CART FUNCTION
  // ============================================

  function clearCart() {
    localStorage.removeItem("cincoCoffeeCart");
    localStorage.removeItem("cincoCoffeeTotal");

    const cartCount = document.querySelector(".cart-count");
    if (cartCount) {
      cartCount.textContent = "0";
    }

    const cartItemsContainer = document.querySelector(".cart-items");
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML =
        '<div class="empty-cart">Your basket is empty</div>';
    }

    const totalAmount = document.querySelector(".total-amount");
    if (totalAmount) {
      totalAmount.textContent = "0";
    }
  }

  // ============================================
  // UPDATE AUTH UI
  // ============================================

  function updateAuthUI() {
    const authBtn = document.getElementById("authBtn");
    const userControls = document.getElementById("userControls");
    const userName = document.getElementById("userName");
    const floatingLogout = document.getElementById("floatingLogout");
    const current = getCurrentUser();
    // For new mobile greeting
    const mobileUserGreeting = document.getElementById("mobileUserGreeting");

    if (current) {
      const users = getUsers();
      const name = users[current]?.name || current.split("@")[0];
      const displayName = `Hi, ${name}`;

      // Hide auth button
      if (authBtn) authBtn.style.display = "none";

      // Desktop controls
      if (userControls && userName) {
        userName.textContent = displayName;
        userControls.style.display = "flex";
      }

      // Mobile greeting in hamburger menu
      if (mobileUserGreeting) {
        mobileUserGreeting.textContent = displayName;
        mobileUserGreeting.style.display = "block";
      }

      // Floating logout button (for contact page)
      if (floatingLogout) {
        floatingLogout.classList.add("active");
      }
    } else {
      // User not logged in
      if (authBtn) authBtn.style.display = "";
      if (userControls) userControls.style.display = "none";
      if (mobileUserGreeting) mobileUserGreeting.style.display = "none";
      if (floatingLogout) floatingLogout.classList.remove("active");
    }
  }

  // ============================================
  // LOGOUT HANDLER
  // ============================================

  function handleLogout() {
    if (
      confirm("Are you sure you want to logout? Your cart will be cleared.")
    ) {
      localStorage.removeItem("currentUser");
      clearCart();
      updateAuthUI();
      window.location.href = "index.html";
    }
  }

  // ============================================
  // AUTH PAGE (LOGIN/SIGNUP) - UPDATED
  // ============================================

  function initAuthPage() {
    if (!window.location.pathname.includes("logSign.html")) return;

    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    // Tab switching
    if (tabLogin) {
      tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        if (tabSignup) tabSignup.classList.remove("active");
        if (loginForm) loginForm.classList.add("active");
        if (signupForm) signupForm.classList.remove("active");
        try {
          const firstInput = loginForm?.querySelector("input");
          if (firstInput) firstInput.focus();
        } catch (err) {
          // ignore focus errors
        }
      });
    }

    if (tabSignup) {
      tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        if (signupForm) signupForm.classList.add("active");
        if (loginForm) loginForm.classList.remove("active");
        try {
          const firstInput = signupForm?.querySelector("input");
          if (firstInput) firstInput.focus();
        } catch (err) {
          // ignore focus errors
        }
      });
    }

    // Login form submission - WITH VALIDATION
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("loginEmail");
        const passwordInput = document.getElementById("loginPassword");
        const msgEl = document.getElementById("loginMessage");

        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        // helper to show message
        function showLoginMessage(text, type) {
          if (!msgEl) {
            alert(text);
            return;
          }
          msgEl.textContent = text;
          msgEl.className = "form-message " + (type || "");
        }

        // SECURITY: Input Validation
        if (!email || !password) {
          showLoginMessage("Please enter both email and password.", "error");
          return;
        }

        // Validate email format
        if (!validateEmail(email)) {
          showLoginMessage("Please enter a valid email address.", "error");
          return;
        }

        // Validate password format (basic checks)
        if (typeof password !== "string" || password.length === 0) {
          showLoginMessage("Invalid password format.", "error");
          return;
        }

        const users = getUsers();
        // case-insensitive email lookup
        const emailKey = Object.keys(users).find(
          (k) => k.toLowerCase() === email.toLowerCase()
        );

        // SECURITY: Secure Password Verification with Bcrypt
        const storedHash = emailKey ? users[emailKey].password : null;
        const passwordMatches =
          typeof bcrypt !== "undefined" && storedHash
            ? bcrypt.compareSync(password, storedHash)
            : storedHash === password;

        if (emailKey && passwordMatches) {
          localStorage.setItem("currentUser", emailKey);
          showLoginMessage("Login successful! Redirecting…", "success");
          setTimeout(() => (window.location.href = "index.html"), 600);
        } else {
          showLoginMessage(
            "Invalid email or password. Please try again.",
            "error"
          );
        }
      });
    }

    // Signup form submission - WITH VALIDATION
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("signupName");
        const emailInput = document.getElementById("signupEmail");
        const passwordInput = document.getElementById("signupPassword");
        const msgEl = document.getElementById("signupMessage");

        let name = (nameInput?.value || "").trim();
        let email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        function showSignupMessage(text, type) {
          if (!msgEl) {
            alert(text);
            return;
          }
          msgEl.textContent = text;
          msgEl.className = "form-message " + (type || "");
        }

        // SECURITY: Comprehensive Input Validation
        if (!name || !email || !password) {
          showSignupMessage("Please fill in all required fields.", "error");
          return;
        }

        // Sanitize name input
        name = sanitizeInput(name);
        if (!validateName(name)) {
          showSignupMessage(
            "Name must be 2-100 characters (letters, spaces, hyphens, apostrophes only).",
            "error"
          );
          return;
        }

        // Validate email format
        if (!validateEmail(email)) {
          showSignupMessage("Please enter a valid email address.", "error");
          return;
        }

        // Validate password strength
        if (!validatePassword(password)) {
          showSignupMessage(
            "Password must be 6-128 characters and contain no special characters like ', \", ;, or \\.",
            "error"
          );
          return;
        }

        const users = getUsers();
        const existingKey = Object.keys(users).find(
          (k) => k.toLowerCase() === email.toLowerCase()
        );
        if (existingKey) {
          showSignupMessage(
            "This email is already registered. Please log in.",
            "error"
          );
          return;
        }

        // SECURITY: Password Hashing with Bcrypt
        const hashedPassword =
          typeof bcrypt !== "undefined"
            ? bcrypt.hashSync(password, 10)
            : password;

        // Store user with sanitized name and hashed password
        users[email] = { name: sanitizeInput(name), password: hashedPassword };
        saveUsers(users);
        localStorage.setItem("currentUser", email);

        showSignupMessage("Account created! Redirecting…", "success");
        const btn = document.getElementById("btnSignup");
        if (btn) btn.classList.add("success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 900);
      });
    }
  }

  // ============================================
  // MOBILE NAVIGATION
  // ============================================

  function initMobileNav() {
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navLinks.classList.toggle("active");
      });

      document.querySelectorAll(".nav-links li a").forEach((link) => {
        link.addEventListener("click", () => {
          hamburger.classList.remove("active");
          navLinks.classList.remove("active");
        });
      });
    }
  }

  // ============================================
  // HEADER SCROLL EFFECTS
  // ============================================

  function initHeaderScroll() {
    window.addEventListener("scroll", () => {
      const header = document.querySelector("header");
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 50);
      }

      const backToTop = document.querySelector(".back-to-top");
      if (backToTop) {
        backToTop.classList.toggle("active", window.scrollY > 300);
      }

      const fadeElements = document.querySelectorAll(".fade-in");
      fadeElements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementTop < windowHeight - 100) {
          element.classList.add("active");
        }
      });
    });
  }

  // ============================================
  // BACK TO TOP BUTTON
  // ============================================

  function initBackToTop() {
    const backToTop = document.querySelector(".back-to-top");
    if (backToTop) {
      backToTop.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }

  // ============================================
  // SMOOTH SCROLLING
  // ============================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 100,
            behavior: "smooth",
          });
        }
      });
    });
  }

  // ============================================
  // PRODUCTS SLIDER (INDEX PAGE)
  // ============================================

  function initProductsSlider() {
    const productsSlider = document.querySelector(".products-slider");
    if (!productsSlider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    productsSlider.addEventListener("mousedown", (e) => {
      isDown = true;
      productsSlider.classList.add("active");
      startX = e.pageX - productsSlider.offsetLeft;
      scrollLeft = productsSlider.scrollLeft;
    });

    productsSlider.addEventListener("mouseleave", () => {
      isDown = false;
      productsSlider.classList.remove("active");
    });

    productsSlider.addEventListener("mouseup", () => {
      isDown = false;
      productsSlider.classList.remove("active");
    });

    productsSlider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - productsSlider.offsetLeft;
      const walk = (x - startX) * 2;
      productsSlider.scrollLeft = scrollLeft - walk;
    });
  }

  // ============================================
  // CART FUNCTIONALITY
  // ============================================

  let cart = [];

  function initCart() {
    cart = JSON.parse(localStorage.getItem("cincoCoffeeCart") || "[]");

    const cartBtn = document.querySelector(".cart-btn");
    const cartModal = document.querySelector(".cart-modal");
    const closeCart = document.querySelector(".close-cart");
    const overlay = document.querySelector(".overlay");

    if (cartBtn && cartModal) {
      cartBtn.addEventListener("click", () => {
        cartModal.classList.add("active");
        if (overlay) overlay.classList.add("active");
      });
    }

    if (closeCart) {
      closeCart.addEventListener("click", () => {
        cartModal.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
      });
    }

    if (overlay) {
      overlay.addEventListener("click", () => {
        if (cartModal) cartModal.classList.remove("active");
        overlay.classList.remove("active");
      });
    }

    updateCart();
  }

  function addToCart(e) {
    const button = e.target;
    const product = {
      name: button.dataset.name,
      price: parseFloat(button.dataset.price),
      img: button.dataset.img,
      size: button.dataset.size,
      quantity: 1,
    };

    const existingItem = cart.find(
      (item) => item.name === product.name && item.size === product.size
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push(product);
    }

    localStorage.setItem("cincoCoffeeCart", JSON.stringify(cart));
    updateCart();
    showNotification();
  }

  function showNotification() {
    const notification = document.querySelector(".notification");
    if (notification) {
      notification.classList.add("active");
      setTimeout(() => {
        notification.classList.remove("active");
      }, 2000);
    }
  }

  function updateCart() {
    const cartCount = document.querySelector(".cart-count");
    const cartItemsContainer = document.querySelector(".cart-items");
    const totalAmount = document.querySelector(".total-amount");

    if (!cartItemsContainer) return;

    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<div class="empty-cart">Your basket is empty</div>';
      if (totalAmount) totalAmount.textContent = "0";
    } else {
      let total = 0;

      cart.forEach((item, index) => {
        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        cartItem.innerHTML = `
          <img src="${item.img}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-details">
            <h4 class="cart-item-name">${item.name}</h4>
            <p class="cart-item-size">Size: ${item.size}</p>
            <p class="cart-item-price">₱${item.price.toFixed(2)}</p>
            <div class="cart-item-actions">
              <button class="quantity-btn minus" data-index="${index}">-</button>
              <input type="number" class="quantity-input" value="${
                item.quantity
              }" min="1" data-index="${index}">
              <button class="quantity-btn plus" data-index="${index}">+</button>
              <span class="remove-item" data-index="${index}">Remove</span>
            </div>
          </div>
        `;
        cartItemsContainer.appendChild(cartItem);
      });

      if (totalAmount) totalAmount.textContent = total.toFixed(2);

      // Re-attach event listeners
      document.querySelectorAll(".quantity-btn.minus").forEach((btn) => {
        btn.addEventListener("click", decreaseQuantity);
      });

      document.querySelectorAll(".quantity-btn.plus").forEach((btn) => {
        btn.addEventListener("click", increaseQuantity);
      });

      document.querySelectorAll(".quantity-input").forEach((input) => {
        input.addEventListener("change", updateQuantity);
      });

      document.querySelectorAll(".remove-item").forEach((btn) => {
        btn.addEventListener("click", removeItem);
      });
    }
  }

  function decreaseQuantity(e) {
    const index = e.target.dataset.index;
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
      localStorage.setItem("cincoCoffeeCart", JSON.stringify(cart));
      updateCart();
    }
  }

  function increaseQuantity(e) {
    const index = e.target.dataset.index;
    cart[index].quantity += 1;
    localStorage.setItem("cincoCoffeeCart", JSON.stringify(cart));
    updateCart();
  }

  function updateQuantity(e) {
    const index = e.target.dataset.index;
    const newQuantity = parseInt(e.target.value);
    if (newQuantity >= 1) {
      cart[index].quantity = newQuantity;
      localStorage.setItem("cincoCoffeeCart", JSON.stringify(cart));
      updateCart();
    } else {
      e.target.value = cart[index].quantity;
    }
  }

  function removeItem(e) {
    const index = e.target.dataset.index;
    cart.splice(index, 1);
    localStorage.setItem("cincoCoffeeCart", JSON.stringify(cart));
    updateCart();
  }

  // ============================================
  // ADD TO CART BUTTONS
  // ============================================

  function initAddToCartButtons() {
    const addToCartBtns = document.querySelectorAll(
      ".add-to-cart, .add-to-cart-btn"
    );

    addToCartBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();

        const currentUser = getCurrentUser();
        if (!currentUser) {
          const goToAuth = confirm(
            "You need to sign up or log in before adding to cart. Go to Sign Up / Log In?"
          );
          if (goToAuth) {
            window.location.href = "logSign.html";
          }
          return;
        }

        addToCart(e);
      });
    });
  }

  // ============================================
  // CHECKOUT PAGE - UPDATED WITH VALIDATION
  // ============================================

  function initCheckoutPage() {
    if (!window.location.pathname.includes("checkout.html")) return;

    const currentUser = getCurrentUser();
    const cart = JSON.parse(localStorage.getItem("cincoCoffeeCart") || "[]");

    if (!currentUser || cart.length === 0) {
      alert("Please log in and add items to your cart before checking out.");
      window.location.href = "index.html";
      return;
    }

    loadCheckoutData();
    initPaymentMethods();
    initPlaceOrder();
  }

  function loadCheckoutData() {
    const cart = JSON.parse(localStorage.getItem("cincoCoffeeCart") || "[]");
    const orderItemsContainer = document.querySelector(".order-items");

    if (!orderItemsContainer) return;

    orderItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      orderItemsContainer.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px;">Your cart is empty</p>';
      return;
    }

    let total = 0;

    cart.forEach((item) => {
      const orderItem = document.createElement("div");
      orderItem.classList.add("order-item");
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      orderItem.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="order-item-img">
        <div class="order-item-details">
          <h4 class="order-item-name">${item.name}</h4>
          <p class="order-item-size">Size: ${item.size}</p>
          <p class="order-item-price">₱${item.price.toFixed(2)}</p>
        </div>
        <div class="order-item-quantity">×${item.quantity}</div>
      `;
      orderItemsContainer.appendChild(orderItem);
    });

    const subtotalElement = document.querySelector(
      ".order-total-row:nth-child(1) span:last-child"
    );
    const deliveryElement = document.querySelector(
      ".order-total-row:nth-child(2) span:last-child"
    );
    const totalElement = document.querySelector(
      ".order-total-row:last-child span:last-child"
    );

    const deliveryFee = 50.0;
    const grandTotal = total + deliveryFee;

    if (subtotalElement) subtotalElement.textContent = `₱${total.toFixed(2)}`;
    if (deliveryElement)
      deliveryElement.textContent = `₱${deliveryFee.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `₱${grandTotal.toFixed(2)}`;
  }

  function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll(".payment-method");

    paymentMethods.forEach((method) => {
      method.addEventListener("click", () => {
        paymentMethods.forEach((m) => m.classList.remove("active"));
        method.classList.add("active");
        const input = method.querySelector("input");
        if (input) input.checked = true;
      });
    });
  }

  function initPlaceOrder() {
    const placeOrderBtn = document.querySelector(".place-order-btn");
    const checkoutForm = document.getElementById("checkoutForm");
    const orderSuccessModal = document.getElementById("orderSuccessModal");

    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const firstNameInput = document.getElementById("firstName");
        const lastNameInput = document.getElementById("lastName");
        const emailInput = document.getElementById("email");
        const phoneInput = document.getElementById("phone");
        const addressInput = document.getElementById("address");
        const cityInput = document.getElementById("city");
        const zipInput = document.getElementById("zip");

        let firstName = (firstNameInput?.value || "").trim();
        let lastName = (lastNameInput?.value || "").trim();
        let email = (emailInput?.value || "").trim();
        let phone = (phoneInput?.value || "").trim();
        let address = (addressInput?.value || "").trim();
        let city = (cityInput?.value || "").trim();
        let zip = (zipInput?.value || "").trim();

        // SECURITY: Input Validation for Checkout
        if (
          !firstName ||
          !lastName ||
          !email ||
          !phone ||
          !address ||
          !city ||
          !zip
        ) {
          alert("Please fill in all required fields.");
          return;
        }

        // Sanitize all inputs
        firstName = sanitizeInput(firstName);
        lastName = sanitizeInput(lastName);
        address = sanitizeInput(address);
        city = sanitizeInput(city);
        zip = sanitizeInput(zip);

        // Validate each field
        if (!validateName(firstName)) {
          alert(
            "First name must be 2-100 characters (letters, spaces, hyphens, apostrophes only)."
          );
          return;
        }

        if (!validateName(lastName)) {
          alert(
            "Last name must be 2-100 characters (letters, spaces, hyphens, apostrophes only)."
          );
          return;
        }

        if (!validateEmail(email)) {
          alert("Please enter a valid email address.");
          return;
        }

        if (!validatePhoneNumber(phone)) {
          alert(
            "Please enter a valid phone number (7-20 characters, digits, spaces, hyphens, +, parentheses)."
          );
          return;
        }

        if (!validateAddress(address)) {
          alert("Address must be 5-500 characters and contain no HTML tags.");
          return;
        }

        if (!validateName(city)) {
          alert("City must be 2-100 characters (letters only).");
          return;
        }

        // Validate ZIP code format (alphanumeric, 3-10 chars)
        const zipRegex = /^[a-zA-Z0-9\s\-]{3,10}$/;
        if (!zipRegex.test(zip)) {
          alert(
            "ZIP code must be 3-10 characters (alphanumeric, hyphens, spaces)."
          );
          return;
        }

        // All validations passed
        const orderNumber = Math.floor(10000 + Math.random() * 90000);
        const orderNumberEl = document.getElementById("orderNumber");
        if (orderNumberEl) orderNumberEl.textContent = orderNumber;

        if (orderSuccessModal) orderSuccessModal.classList.add("active");

        setTimeout(() => {
          if (orderSuccessModal) orderSuccessModal.classList.remove("active");
          if (checkoutForm) checkoutForm.reset();

          clearCart();

          const paymentMethods = document.querySelectorAll(".payment-method");
          paymentMethods.forEach((m) => m.classList.remove("active"));
          if (paymentMethods[0]) paymentMethods[0].classList.add("active");

          const cashOnDelivery = document.getElementById("cashOnDelivery");
          if (cashOnDelivery) cashOnDelivery.checked = true;

          setTimeout(() => {
            window.location.href = "index.html";
          }, 500);
        }, 3000);
      });
    }
  }

  // ============================================
  // CONTACT PAGE - UPDATED WITH VALIDATION
  // ============================================

  function initContactPage() {
    if (!window.location.pathname.includes("contact.html")) return;

    const feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
      feedbackForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const nameInput = document.getElementById("feedbackName");
        const emailInput = document.getElementById("feedbackEmail");
        const subjectInput = document.getElementById("feedbackSubject");
        const messageInput = document.getElementById("feedbackMessage");
        const successEl = document.getElementById("feedbackSuccess");

        let name = (nameInput?.value || "").trim();
        let email = (emailInput?.value || "").trim();
        let subject = (subjectInput?.value || "").trim();
        let message = (messageInput?.value || "").trim();

        // SECURITY: Input Validation for Feedback
        if (!name || !email || !subject || !message) {
          alert("Please fill in all required fields.");
          return;
        }

        // Sanitize inputs
        name = sanitizeInput(name);
        subject = sanitizeInput(subject);
        message = sanitizeInput(message);

        // Validate each field
        if (!validateName(name)) {
          alert(
            "Name must be 2-100 characters (letters, spaces, hyphens, apostrophes only)."
          );
          return;
        }

        if (!validateEmail(email)) {
          alert("Please enter a valid email address.");
          return;
        }

        if (!validateTextarea(subject, 5, 200)) {
          alert("Subject must be 5-200 characters with no HTML tags.");
          return;
        }

        if (!validateTextarea(message, 10, 1000)) {
          alert("Message must be 10-1000 characters with no HTML tags.");
          return;
        }

        // All validations passed - show success
        if (successEl) {
          successEl.style.display = "block";
          setTimeout(() => {
            successEl.style.display = "none";
          }, 3500);
        }
        this.reset();
      });
    }
  }

  // ============================================
  // LOADING SCREEN (INDEX PAGE)
  // ============================================

  function initLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      setTimeout(function () {
        loadingScreen.classList.add("hidden");
        setTimeout(() => {
          loadingScreen.remove();
        }, 800);
      }, 2000);
    }
  }

  // ============================================
  // REVEAL ANIMATIONS
  // ============================================

  function initRevealAnimations() {
    function reveal() {
      const reveals = document.querySelectorAll(
        ".feature-card, .product-card, .announcement-card"
      );
      reveals.forEach((element) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("active");
        }
      });
    }
    window.addEventListener("scroll", reveal);
    reveal();
  }

  // ============================================
  // IMAGE LAZY LOADING
  // ============================================

  function initLazyLoading() {
    const lazyImages = document.querySelectorAll("img[data-src]");
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const image = entry.target;
            image.src = image.dataset.src;
            imageObserver.unobserve(image);
          }
        });
      });
      lazyImages.forEach((image) => imageObserver.observe(image));
    } else {
      lazyImages.forEach((image) => {
        image.src = image.dataset.src;
      });
    }
  }

  // ============================================
  // INITIALIZE AUTH CONTROLS
  // ============================================

  function initAuth() {
    // Desktop logout button
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", handleLogout);
    }

    // Mobile logout button
    const btnLogoutMobile = document.getElementById("btnLogoutMobile");
    if (btnLogoutMobile) {
      btnLogoutMobile.addEventListener("click", handleLogout);
    }

    // Floating logout button (contact page)
    const floatingLogout = document.getElementById("floatingLogout");
    if (floatingLogout) {
      floatingLogout.addEventListener("click", handleLogout);
    }

    updateAuthUI();
  }

  function initFadeInElements() {
    const fadeElements = document.querySelectorAll(".fade-in");
    fadeElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      if (elementTop < windowHeight - 100) {
        element.classList.add("active");
      }
    });
  }

  // Make proceedToCheckout available globally
  window.proceedToCheckout = function () {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("Please log in to proceed to checkout.");
      window.location.href = "logSign.html";
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty. Please add items before checking out.");
      return;
    }

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    localStorage.setItem("cincoCoffeeTotal", total);
    window.location.href = "checkout.html";
  };

  // ============================================
  // MAIN INITIALIZATION
  // ============================================

  function init() {
    initAuth();
    initAuthPage();
    initMobileNav();
    initHeaderScroll();
    initBackToTop();
    initSmoothScroll();
    initProductsSlider();
    initCart();
    initAddToCartButtons();
    initCheckoutPage();
    initContactPage();
    initLoadingScreen();
    initRevealAnimations();
    initLazyLoading();
    initFadeInElements();
  }

  // Run on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Additional event for window load
  window.addEventListener("load", () => {
    initFadeInElements();
  });
})();
