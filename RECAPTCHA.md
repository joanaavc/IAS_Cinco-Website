# reCAPTCHA v3 Setup Guide

## Getting Your reCAPTCHA v3 Site Key

### Step 1: Go to Google reCAPTCHA Admin Console

Visit: https://www.google.com/recaptcha/admin

### Step 2: Sign In

Sign in with your Google account (create one if needed)

### Step 3: Create New Site

- Click the **+** button
- **Label**: "Cinco Coffee Website"
- **reCAPTCHA type**: Select "reCAPTCHA v3"
- **Domains**:
  - `localhost` (for development)
  - `yourdomain.com` (for production)
- Accept the terms
- Click **Submit**

### Step 4: Copy Your Keys

You'll see two keys:

- **Site Key** - Use in your HTML (public)
- **Secret Key** - Use on your backend only (private)

### Step 5: Update Your Website

#### In `logSign.html` (2 places):

**Replace this line:**

```html
<script src="https://www.google.com/recaptcha/api.js?render=6LdZRhgsAAAAAA7o0EpsdmfO38VvnHxjNG6Ab0g2"></script>
```

**With:**

```html
<script src="https://www.google.com/recaptcha/api.js?render=6LdZRhgsAAAAAA7o0EpsdmfO38VvnHxjNG6Ab0g2"></script>
```

#### In `cincoscript.js`:

**Replace this line (appears 2 times):**

```javascript
grecaptcha.execute("6LdZRhgsAAAAAA7o0EpsdmfO38VvnHxjNG6Ab0g2", { action: action });
```

**With:**

```javascript
grecaptcha.execute("6LdZRhgsAAAAAA7o0EpsdmfO38VvnHxjNG6Ab0g2", { action: action });
```

## How It Works

### Client-Side (What Your Website Does)

1. User submits login/signup form
2. reCAPTCHA analyzes user behavior:
   - Mouse movements
   - Typing patterns
   - Browser fingerprint
   - Interaction patterns
3. Assigns a score: 0.0 (bot) to 1.0 (human)
4. Sends token to form submission

### Server-Side (Production Only)

In production, you should:

1. Receive the token
2. Send it to your backend with your **Secret Key**
3. Verify the token's authenticity
4. Check the score (default threshold: 0.5)
5. Proceed with login if verified

## Testing

### Local Development

- Works on `localhost` without SSL
- reCAPTCHA will show a "I'm not a robot" checkbox
- This is expected for v3 in development

### Production

- Requires HTTPS/SSL certificate
- reCAPTCHA runs silently (no checkbox)
- No user interaction needed
- Works automatically

## Rate Limiting Configuration

Edit in `cincoscript.js`:

```javascript
const RATE_LIMIT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5, // Lockout after 5 failures
  LOCKOUT_DURATION_MINUTES: 15, // Lock for 15 minutes
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  RECAPTCHA_THRESHOLD: 0.5, // Score above 0.5 = human
};
```

## Threats Prevented

✅ Brute Force Attacks - Unlimited guessing prevented
✅ Automated Bot Attacks - reCAPTCHA blocks bots
✅ Credential Stuffing - Rate limiting stops rapid attempts
✅ Account Takeover - 15-minute lockout delays attacks
✅ Spam Signups - reCAPTCHA prevents bot registration

## Monitoring

Check Google reCAPTCHA Admin Console for:

- Bot traffic patterns
- Failed verification attempts
- Geographic attack origins
- Attack trends over time
