# CINCO COFFEE WEBSITE
## Web Development Project Documentation
### Phase 1-2 Complete Implementation

**Course:** CC312-M Web Development  
**Program:** BSIS/BSIT 3rd Year  
**Institution:** Technological University of the Philippines  
**Submission Date:** December 12, 2025

---

## 📋 PROJECT OVERVIEW

### Team Members & Roles

| Name | Role | Responsibilities |
|------|------|-----------------|
| **Ayop, Joana Crisha V.** | Project Manager & Lead Designer | CSS styling, responsive design, visual consistency, accessibility compliance |
| **Mendoza, Ceazar Jr. V.** | Lead Developer & Backend Logic | JavaScript functionality, shopping cart system, form validation, debugging |
| **Tabios, Ryan Harold G.** | Content Developer & Front-End Integration | Content writing, product catalog, image optimization, UX testing |

---

## 🌐 LIVE DEPLOYMENT

- **GitHub Repository:** `https://github.com/[username]/cinco-coffee-website`
- **GitHub Pages URL:** `https://[username].github.io/cinco-coffee-website`
- **Local Development:** VS Code with Live Server extension

---

## 📁 PROJECT STRUCTURE

```
ProjectFolder/
├── index.html                 # Homepage
├── about us.html             # Company information
├── productupdate.html        # Product catalog
├── announcements.html        # Promotions & events
├── contact.html              # Contact & feedback form
├── checkout.html             # Order processing
├── logSign.html              # Authentication page
├── cincostyles.css           # Unified stylesheet
├── cincoscript.js            # Main JavaScript file
├── bcrypt.min.js             # Password hashing library
├── assets/                   # Images and media
│   ├── americano.png
│   ├── cafe latte.png
│   ├── sea salt latte.png
│   └── [other product images]
├── README.md                 # Project documentation
├── .gitignore               # Git exclusions
└── LICENSE                  # Open-source license
```

---

## 🎨 DESIGN IMPLEMENTATION

### Color Scheme
- **Primary Brand Color:** `#D4764E` (Coral/Burnt Orange)
- **Secondary Background:** `#F5EFE7` (Cream/Beige)
- **Text Color:** `#3B2B2A` (Deep Brown)
- **Accent Color:** `#FF9800` (Orange)

**Design Rationale:**
- Warm colors evoke comfort and coffee experience
- High contrast ensures WCAG AA accessibility compliance
- Consistent application across all pages for brand recognition

### Typography
- **Headings:** Playfair Display (Serif, 400-700 weights)
- **Body Text:** Poppins (Sans-serif, 300-700 weights)
- **Base Font Size:** 14px (mobile), 16px (desktop)

**Accessibility Features:**
- Responsive font scaling across devices
- Sufficient line-height (1.6) for readability
- Clear hierarchy through font weight variation

---

## ⚙️ TECHNICAL IMPLEMENTATION

### HTML Structure
**Semantic Elements Used:**
- `<header>` - Navigation and branding
- `<nav>` - Navigation menus
- `<section>` - Content sections
- `<article>` - Product cards
- `<footer>` - Site footer with links

**Accessibility Features:**
- ARIA labels on interactive elements
- Alt text on all images
- Proper form labels and associations
- Keyboard navigation support

### CSS Architecture
**Key Features:**
```css
/* CSS Variables for consistency */
:root {
  --primary: #5d4037;
  --secondary: #8d6e63;
  --accent: #ff9800;
  --brand: #d4764e;
  --cream: #f5efe7;
}

/* Responsive breakpoints */
@media (max-width: 768px) { /* Tablet */ }
@media (max-width: 480px) { /* Mobile */ }
```

**Layout Techniques:**
- CSS Grid for product layouts
- Flexbox for navigation and cards
- Mobile-first responsive design
- Smooth transitions and animations

### JavaScript Functionality

#### 1. **Session Management**
```javascript
// User authentication with 30-minute timeout
SessionManager.create(email, { userId, token });
SessionManager.isValid(); // Check session status
```

#### 2. **Shopping Cart System**
```javascript
// Add items to cart (requires login)
addToCart({
  id: 'product-id',
  name: 'Spanish Latte',
  price: 90,
  size: '16oz',
  qty: 1
});

// Cart persists in localStorage
// Separate carts per logged-in user
```

#### 3. **Form Validation**
- Email format validation with regex
- Password strength requirements (8+ characters)
- Sanitization against XSS attacks
- Required field checking

#### 4. **Security Features**
- **Password Hashing:** bcrypt.js (10 rounds)
- **Input Sanitization:** Strip HTML tags and dangerous patterns
- **Rate Limiting:** Login attempts limited to 5 per 15 minutes
- **Session Expiry:** Automatic logout after 30 minutes inactivity

---

## 📄 PAGE DESCRIPTIONS

### 1. **Homepage (`index.html`)**
**Purpose:** Brand introduction and product showcase

**Key Sections:**
- Hero section with tagline "Fuel Your Day, Wherever You Wander"
- About preview with founding story
- "Why Choose Cinco" features (4 value propositions)
- Popular products slider with 4 bestsellers
- Call-to-action buttons (Explore Products, Find Us, Sign Up)

**Interactive Elements:**
- Auto-scrolling product slider
- Hover effects on product cards
- Responsive navigation menu

### 2. **About Us (`about us.html`)**
**Purpose:** Company story and values

**Key Sections:**
- **Our Story:** Founding narrative of 4 FEU students
- **Our Vision:** "Reimagining Coffee for Modern Life"
- **Our Mission:** On-the-go quality coffee delivery
- **Our Goals:** 3 strategic objectives with icons

**Design Features:**
- Alternating image-text layout
- Fade-in animations on scroll
- Icon-based value cards

### 3. **Products (`productupdate.html`)**
**Purpose:** Complete beverage catalog with e-commerce functionality

**Product Categories:**
- **Coffee Drinks (7):** Americano, Café Latte, Spanish Latte, French Vanilla, White Choco Mocha, Sea Salt Latte, Caramel Macchiato
- **Non-Coffee Drinks (5):** Milky Ube, Strawberry Milk, Caramel Milk, Matcha Latte, Milky Choco

**Pricing Structure:**
- 350ml bottles: ₱70-₱100
- 16oz cups: ₱70-₱100

**Features:**
- Dual "Add to Cart" buttons per product (350ml & 16oz)
- Real-time cart count badge
- Product images with lazy loading
- Responsive grid layout (4→2→1 columns)

### 4. **Announcements (`announcements.html`)**
**Purpose:** Promotions and pop-up event information

**Content:**
- **Promotions:**
  - "Buy Two Get One Free" (Mon-Tue)
  - "Buy 3 Get 2" bundle offer
  - Validity dates displayed
  
- **Pop-Up Locations:**
  - Pop Up Katipunan (June 15-17, 2026)
  - Cubao Expo Center (June 22-24, 2026)
  - Maps and venue details

### 5. **Contact (`contact.html`)**
**Purpose:** Customer communication and feedback

**Sections:**
1. **Contact Information:**
   - Phone: 09163047835
   - Email: cinco5@gmail.com
   - Address: Quezon City, Metro Manila
   - Social media links (Facebook, Instagram, TikTok)

2. **Business Hours:**
   - Monday-Friday: 8:00 AM - 6:00 PM
   - Saturday-Sunday: 10:00 AM - 8:00 PM

3. **Feedback Form:**
   - Name, Email, Subject, Message fields
   - Form validation before submission
   - Success notification on submit
   - Data stored in localStorage

### 6. **Checkout (`checkout.html`)**
**Purpose:** Order processing and payment

**Form Fields:**
- Customer Information: First Name, Last Name, Email, Phone
- Delivery Address: Street, City, ZIP Code
- Payment Methods:
  - Cash on Delivery
  - GCash
  - Credit/Debit Card
- Order Notes (optional)

**Order Summary:**
- Itemized product list with images
- Quantity and individual prices
- Subtotal calculation
- Fixed delivery fee: ₱50
- Final total display

**Checkout Flow:**
1. Cart validation (prevent empty orders)
2. Form validation (all required fields)
3. Order number generation (6-digit)
4. Success modal display
5. Cart clearance
6. Redirect to products page

### 7. **Login/Signup (`logSign.html`)**
**Purpose:** User authentication

**Features:**
- Tab-based interface (Login/Signup toggle)
- Password visibility toggle
- Form validation with error messages
- BCrypt password hashing
- reCAPTCHA v3 integration (anti-bot)
- Rate limiting (5 attempts per 15 min)
- Session creation on success
- Redirect to homepage after login

---

## 🛒 SHOPPING CART SYSTEM

### Architecture
```javascript
// Cart storage structure
localStorage.cincoCart = {
  "user123": [
    {
      id: "spanish-latte-16oz",
      name: "Spanish Latte",
      price: 90,
      qty: 2,
      size: "16oz",
      img: "assets/spanish latte.png"
    }
  ]
}
```

### Key Functions
1. **addToCart(item)** - Requires login, adds/updates cart
2. **updateCartCount()** - Updates badge with total items
3. **rebuildCartModal()** - Renders cart contents
4. **removeFromCart(index)** - Removes specific item
5. **User-specific carts** - Each user has separate cart data

### User Experience
- Login required notification if not authenticated
- Real-time cart count updates
- Visual feedback on add (success toast)
- Quantity adjustment controls
- Item removal with confirmation
- Persistent across page navigation
- Cart modal with overlay backdrop

---

## 🔒 SECURITY MEASURES

### 1. **Authentication Security**
- **Password Hashing:** BCrypt with 10 salt rounds
- **Session Tokens:** Random 32-character tokens
- **Session Timeout:** 30 minutes of inactivity
- **Login Rate Limiting:** Max 5 attempts per 15 minutes
- **Account Lockout:** 15-minute cooldown after 5 failed attempts

### 2. **Input Sanitization**
```javascript
function sanitizeInput(raw) {
  // Remove script/style tags
  // Strip HTML tags
  // Remove control characters
  // Detect dangerous patterns (SQL injection, XSS)
}
```

### 3. **Protected Against:**
- Cross-Site Scripting (XSS)
- SQL Injection patterns
- Script injection via forms
- Malicious file uploads (N/A - no upload feature)
- Session hijacking (token-based auth)

### 4. **Data Validation**
- Email format verification (regex)
- Password complexity (8+ chars)
- Phone number validation
- Required field enforcement
- Client-side + server-side validation (client-side implemented)

---

## 📱 RESPONSIVE DESIGN

### Breakpoints
```css
/* Desktop: Default (1200px+) */
/* Tablet: 768px - 1199px */
@media (max-width: 768px) { }

/* Mobile: 480px - 767px */
@media (max-width: 480px) { }

/* Extra Small: < 480px */
@media (max-width: 360px) { }
```

### Mobile Optimizations
- **Navigation:** Hamburger menu with slide-out drawer
- **Product Grid:** 4 → 2 → 1 column layout
- **Cart Button:** Fixed position, always accessible
- **Forms:** Full-width inputs with increased touch targets
- **Typography:** Scaled font sizes (14px base mobile)
- **Images:** Lazy loading with responsive srcset (future enhancement)

### Touch Interactions
- Minimum 44px × 44px touch targets
- Swipe gestures for cart modal
- Pull-to-refresh compatibility
- Hover states removed on touch devices

---

## 🧪 TESTING & VALIDATION

### Browser Compatibility
✅ **Tested On:**
- Chrome 120+ (Primary development browser)
- Firefox 121+
- Microsoft Edge 120+
- Safari 17+ (macOS/iOS)

### Device Testing
✅ **Tested Devices:**
- Desktop: 1920×1080, 1366×768
- Tablet: iPad (768×1024), Android tablet
- Mobile: iPhone 12 Pro (390×844), Samsung Galaxy S21 (360×800)

### Functionality Tests
✅ **All Features Verified:**
- [x] Navigation menu (desktop + mobile)
- [x] Add to cart functionality
- [x] Cart persistence across pages
- [x] Login/Signup forms
- [x] Session management
- [x] Form validations
- [x] Checkout process
- [x] Order number generation
- [x] Responsive layouts
- [x] Image loading
- [x] Scroll animations
- [x] Modal overlays

### Accessibility Audit
✅ **WCAG 2.1 Level AA Compliance:**
- Color contrast ratios: 4.5:1 (normal text), 3:1 (large text)
- Keyboard navigation: All interactive elements accessible
- Screen reader support: Semantic HTML, ARIA labels
- Focus indicators: Visible on all focusable elements
- Alt text: Provided for all informational images

---

## 🚀 DEPLOYMENT PROCESS

### GitHub Repository Setup
```bash
# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. Initial commit
git commit -m "Initial commit: Cinco Coffee website"

# 4. Create GitHub repository (via GitHub.com)
# Repository name: cinco-coffee-website
# Description: On-the-go coffee ordering website

# 5. Link remote repository
git remote add origin https://github.com/[username]/cinco-coffee-website.git

# 6. Push to GitHub
git branch -M main
git push -u origin main
```

### GitHub Pages Deployment
**Steps:**
1. Navigate to repository Settings
2. Click "Pages" in left sidebar
3. Under "Source", select branch: `main`
4. Select folder: `/ (root)`
5. Click "Save"
6. Wait 2-3 minutes for deployment
7. Access live site at: `https://[username].github.io/cinco-coffee-website`

### Local Development Server
```bash
# Using VS Code Live Server extension
1. Install "Live Server" extension
2. Right-click on index.html
3. Select "Open with Live Server"
4. Browser opens at http://localhost:5500
```

---

## 📊 CHALLENGES & SOLUTIONS

### Challenge 1: Session Management Across Pages
**Problem:** User sessions not persisting between page navigations.

**Solution:**
- Implemented unified `SessionManager` class in `cincoscript.js`
- Used `localStorage` for session persistence
- Added automatic session timeout (30 min)
- Created activity listeners to refresh session on user interaction

### Challenge 2: Shopping Cart User Isolation
**Problem:** All users seeing the same cart contents.

**Solution:**
- Restructured cart storage to be user-specific:
  ```javascript
  localStorage.cincoCart = {
    "userId123": [items],
    "userId456": [items]
  }
  ```
- Cart only accessible after login
- Each user's cart isolated by `userId`

### Challenge 3: Mobile Navigation Menu Not Working
**Problem:** Hamburger menu not toggling on mobile devices.

**Solution:**
- Added explicit z-index layers
- Ensured click handlers bound after DOM load
- Implemented touch event listeners
- Fixed CSS pointer-events issues

### Challenge 4: Form Validation and Security
**Problem:** Forms accepting malicious input (XSS attempts).

**Solution:**
- Created `sanitizeInput()` function
- Added pattern detection for dangerous content
- Implemented BCrypt password hashing
- Added rate limiting on login attempts

### Challenge 5: Checkout Page Cart Not Rendering
**Problem:** Cart items not displaying on checkout page load.

**Solution:**
- Created `initCheckoutPage()` function to run on page load
- Added session restoration from localStorage
- Implemented immediate cart rendering without waiting for DOMContentLoaded
- Added fallback session checks

---

## 🎯 FEATURES IMPLEMENTED

### ✅ Core Features (Required)
- [x] Responsive design (mobile, tablet, desktop)
- [x] Semantic HTML structure
- [x] CSS styling with consistent design
- [x] JavaScript interactivity
- [x] Form validation
- [x] Multi-page navigation
- [x] GitHub repository with commits
- [x] GitHub Pages deployment

### ✅ Enhanced Features (Extra Credit)
- [x] User authentication system
- [x] Shopping cart with persistence
- [x] Password encryption (BCrypt)
- [x] Session management with timeout
- [x] Login rate limiting
- [x] Input sanitization for security
- [x] Accessibility features (WCAG AA)
- [x] Loading screen animation
- [x] Toast notifications
- [x] Modal overlays
- [x] Lazy loading optimization
- [x] Back-to-top button
- [x] Smooth scroll animations

---

## 📸 SCREENSHOTS

### Local Development (VS Code)
*Screenshot showing project open in VS Code with file structure visible*

### GitHub Repository
*Screenshot of GitHub repository showing commits and file structure*

### GitHub Pages Live Site
*Screenshot of deployed website homepage*

---

## 📚 LESSONS LEARNED

### Technical Skills Gained
1. **Git & Version Control:**
   - Branching and merging strategies
   - Commit message best practices
   - Collaborative workflows

2. **Responsive Design:**
   - Mobile-first methodology
   - CSS Grid and Flexbox mastery
   - Media query optimization

3. **JavaScript Programming:**
   - DOM manipulation techniques
   - Event-driven programming
   - LocalStorage API usage
   - Asynchronous operations

4. **Web Security:**
   - Password hashing principles
   - Input validation importance
   - XSS and injection prevention
   - Session management

### Team Collaboration
- Task delegation and accountability
- Communication through GitHub issues
- Code review processes
- Merge conflict resolution

### Best Practices
- Semantic HTML for accessibility
- CSS organization and naming conventions
- JavaScript modularization
- Code commenting and documentation
- Testing across devices and browsers

---

## 🔮 FUTURE ENHANCEMENTS

### Phase 3 Potential Features
1. **Backend Integration:**
   - Node.js/Express server
   - MongoDB database for products and orders
   - Real payment gateway (PayMongo, Stripe)
   - Email notifications (SendGrid)

2. **Advanced Features:**
   - User dashboard with order history
   - Product reviews and ratings
   - Loyalty points system
   - Real-time order tracking
   - Admin panel for product management

3. **Performance Optimizations:**
   - Image optimization (WebP format)
   - Code minification and bundling
   - Content Delivery Network (CDN)
   - Progressive Web App (PWA) conversion

4. **Analytics & Marketing:**
   - Google Analytics integration
   - Social media sharing buttons
   - Newsletter subscription
   - Discount code system

---

## 📖 REFERENCES

### Documentation Used
- [MDN Web Docs](https://developer.mozilla.org/) - HTML, CSS, JavaScript reference
- [W3C Web Accessibility](https://www.w3.org/WAI/) - WCAG guidelines
- [GitHub Pages Documentation](https://docs.github.com/pages) - Deployment guide
- [Google Fonts](https://fonts.google.com/) - Typography resources
- [BCrypt.js Documentation](https://github.com/dcodeIO/bcrypt.js) - Password hashing

### Design Inspiration
- Coffee shop websites (Starbucks, Blue Bottle)
- E-commerce platforms (Shopify themes)
- Color psychology resources
- UI/UX design principles

---

## 📝 CONCLUSION

The Cinco Coffee website successfully meets all Phase 1-2 requirements and exceeds expectations with additional security and e-commerce features. The project demonstrates:

✅ **Technical Proficiency:** Clean, semantic code with modern web standards  
✅ **Design Excellence:** Consistent, accessible, and visually appealing interface  
✅ **Functional Completeness:** Fully operational shopping cart and checkout system  
✅ **Security Awareness:** Implemented authentication and input validation  
✅ **Professional Deployment:** Live on GitHub Pages with proper version control

The team successfully collaborated to deliver a production-ready website that serves as a functional business platform for Cinco Coffee's online presence.

---

## 📧 CONTACT

**Project Team:**
- Joana Crisha V. Ayop - [email]
- Ceazar Jr. V. Mendoza - [email]
- Ryan Harold G. Tabios - [email]

**Instructor:**
- Dr. Mary Joy D. Viñas

**Institution:**
- Technological University of the Philippines
- College of Science, BSIS/BSIT 3A

---

*Document prepared for Web Development (CC312-M) course submission*  
*Last updated: December 2025*
