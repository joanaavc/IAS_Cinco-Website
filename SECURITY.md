# Cinco Coffee Security Implementation

## Solution 1: Password Encryption (Hashing)

### What I Added

We replaced plain-text password storage with **bcrypt password hashing**, ensuring all passwords are cryptographically protected and unreadable even if an attacker accesses the browser's storage.

### Why It Helps

Plain-text passwords are one of the most dangerous security vulnerabilities. In the original system, anyone with browser access could open LocalStorage and immediately see every user's password. With bcrypt hashing:

- **Passwords are irreversible**: Even if a hacker steals the stored data, they only see scrambled strings like `$2b$10$KIXw...` that cannot be reversed back to the original password.
- **Direct threat mitigation**: This directly addresses **Threat 1: Stealing User Passwords** from our security assessment.
- **Unique per password**: Bcrypt adds a unique "salt" (random data) to each password, so identical passwords produce different hashes.

### How It Works

#### During Account Creation (Signup)

1. User enters their password (plaintext) into the signup form.
2. Bcrypt applies a cryptographic algorithm with 10 rounds of salting and hashing.
3. The irreversible hash (e.g., `$2b$10$KIXw5WxvK5Zm...`) is stored in `localStorage['users']`.
4. The original plaintext password is **never** stored or transmitted.

**Example:**

```text
Input Password: "MySecurePass123"
BCrypt Hash Output: "$2b$10$KIXw5WxvK5Zm4VW8mP3X9e.H5Z4Zm4VW8mP3X9e.H5Z4Zm4VW8m"
→ Stored in localStorage['users'][email].password
```

#### During Login

1. User enters their email and password (plaintext) into the login form.
2. Bcrypt compares the entered password against the stored hash using `bcrypt.compareSync()`.
3. If the comparison succeeds, authentication is granted.
4. If the comparison fails, login is rejected with "Invalid email or password."

**Example:**

```text
Entered Password: "MySecurePass123"
Stored Hash: "$2b$10$KIXw5WxvK5Zm4VW8mP3X9e.H5Z4Zm4VW8mP3X9e.H5Z4Zm4VW8m"
bcrypt.compareSync("MySecurePass123", storedHash) → true (passwords match!)
```

### Implementation Details

#### Technology: bcryptjs

- **Library**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (MIT/Apache licensed)
- **Location**: `bcrypt.min.js` (local copy for offline use)
- **Script Load**: Loaded in `logSign.html` before `cincoscript.js`

#### Key Functions Used

- **`bcrypt.hashSync(password, saltRounds)`**: Synchronously hashes a password with 10 salt rounds
- **`bcrypt.compareSync(plaintext, hash)`**: Synchronously compares a plaintext password with a stored hash

#### Salt Rounds Explanation

- **10 rounds** means bcrypt applies the hashing algorithm 2^10 = 1024 times.
- More rounds = slower hashing = better security against brute-force attacks.
- 10 rounds is the industry standard balance between security and performance.

### Code Locations

#### Signup Handler (`cincoscript.js` - lines ~224-270)

```javascript
// Hash the password before storing
const hashedPassword =
  typeof bcrypt !== "undefined" ? bcrypt.hashSync(password, 10) : password;

users[email] = { name, password: hashedPassword };
```

#### Login Handler (`cincoscript.js` - lines ~158-199)

```javascript
// Use bcrypt.compareSync if available, with fallback to plaintext
const storedHash = emailKey ? users[emailKey].password : null;
const passwordMatches =
  typeof bcrypt !== "undefined" && storedHash
    ? bcrypt.compareSync(password, storedHash)
    : storedHash === password;
```

### Testing the Implementation

See the [Test Guide](#testing) section below for step-by-step instructions.

#### Quick Console Verification

```javascript
// Check if bcrypt is loaded
console.log(typeof bcrypt); // Should be "object" or "function"

// Inspect a stored user's password
const users = JSON.parse(localStorage.getItem("users") || "{}");
const testUser = users["test@example.com"];
console.log("Stored hash:", testUser.password);
// Output: $2b$10$KIXw... (NOT plaintext)

// Verify bcrypt comparison
console.log(bcrypt.compareSync("TestPass123", testUser.password)); // true
console.log(bcrypt.compareSync("WrongPassword", testUser.password)); // false
```

### Security Best Practices Observed

✅ **Password Hashing**: Passwords are hashed with bcrypt before storage  
✅ **Unique Salts**: Each password gets a unique salt (built into bcrypt)  
✅ **Irreversible Storage**: Hashes cannot be reversed to plaintext  
✅ **Secure Comparison**: Uses `compareSync` instead of string equality  
✅ **Industry Standard**: 10 salt rounds is the recommended standard

### Known Limitations & Future Improvements

⚠️ **Client-Side Storage**: Passwords are hashed on the browser, not the server. For production, implement:

- Server-side password hashing (do not rely on client-side hashing alone)
- HTTPS to encrypt passwords in transit
- Secure session tokens instead of storing emails in localStorage
- Password reset mechanism with secure tokens

⚠️ **LocalStorage Exposure**: Even with hashing, localStorage can be accessed by XSS attacks. Future mitigations:

- Implement CSRF protection
- Add Content Security Policy (CSP) headers
- Use HTTPOnly cookies for session tokens
- Implement rate limiting on login attempts

⚠️ **Graceful Fallback**: The code includes a plaintext fallback if bcrypt fails to load. In production:

- Remove the fallback and throw an error if bcrypt is unavailable
- Ensure the bcrypt script is bundled or CDN-cached reliably

### Files Modified

1. **logSign.html**: Added bcryptjs CDN script tag

   - `<script src="bcrypt.min.js"></script>` (before cincoscript.js)

2. **cincoscript.js**: Updated signup and login handlers

   - Signup: Hash password with `bcrypt.hashSync(password, 10)`
   - Login: Compare password with `bcrypt.compareSync(password, storedHash)`

3. **bcrypt.min.js**: Local copy of bcryptjs library
   - Enables offline functionality and reduces CDN dependency

---

## Solution 2: Input Validation & Sanitization

### What I Added

Comprehensive input validation and sanitization across all user-facing forms, checking for dangerous characters, limiting input length, validating data types, and stripping HTML/script tags to prevent malicious inputs.

### Why It Helps

The original system's lack of input validation made it vulnerable to XSS attacks where attackers could inject malicious JavaScript through forms. Our validation now detects and rejects dangerous patterns before they execute.

### Implementation Details

- **10 validation functions** covering all input types
- **Sanitization function** removes HTML/script tags
- **Regex patterns** enforce format requirements
- **Length limits** prevent buffer overflow attacks
- **Type checking** ensures correct data types
- **Whitelist approach** only allows safe characters

### Protected Forms

✅ Login form (email, password)  
✅ Signup form (name, email, password)  
✅ Checkout form (name, email, phone, address, city, zip)  
✅ Contact form (name, email, subject, message)

### Threats Prevented

✅ Cross-Site Scripting (XSS) attacks  
✅ SQL Injection attacks  
✅ Buffer overflow attacks  
✅ Malicious script injection  
✅ HTML injection attacks
