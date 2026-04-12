# QR Manager

A lightweight, serverless QR code management application. Create, manage, and share QR codes that redirect to custom URLs. All data is stored in Google Sheets via Google Apps Script—no database, no backend server needed.

## ✨ Features

- **Pure Frontend** — HTML + JavaScript + jQuery. No build process, no bundler.
- **Google Sheets Backend** — All data persisted in Google Sheets via Apps Script API.
- **Serverless** — Deploy once to any static hosting; runs forever via HTTPS.
- **Login System** — Default admin/admin user, stored securely in Google Sheets.
- **QR CRUD** — Create, read, update, delete QR codes with custom redirect URLs.
- **Change Password** — Authenticated users can change their password from the dashboard.
- **Optimized URLs** — Compressed QR redirect URLs (~31% shorter) for easier scanning.
- **Mobile-Friendly** — Public redirect page works on any device without prior configuration.
- **Backward Compatible** — Old QR formats still work alongside new compressed format.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Browser (Static HTML/JS/CSS)       │
│  - index.html (main app)            │
│  - r/index.html (public redirect)   │
│  - API URL embedded in base64       │
└──────────────┬──────────────────────┘
               │ HTTP/HTTPS
               ▼
┌─────────────────────────────────────┐
│  Google Apps Script (API)           │
│  - REST endpoints (doGet/doPost)    │
│  - Login-or-register, CRUD QR       │
└──────────────┬──────────────────────┘
               │ Google API
               ▼
┌─────────────────────────────────────┐
│  Google Sheets (Database)           │
│  - users | qr_codes | settings      │
└─────────────────────────────────────┘
```

## 📋 Tech Stack

- **Frontend:** HTML, vanilla JavaScript, jQuery 3.7.1, Tailwind CSS
- **Backend:** Google Apps Script (serverless)
- **Database:** Google Sheets
- **QR Generation:** qrcodejs 1.0.0
- **Hosting:** Any static host (GitHub Pages, Apache, nginx, etc.)
- **Security:** SHA-256 password hashing (via Web Crypto API)

## 🚀 Quick Start

### 1. Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a blank spreadsheet → rename to **QR Manager DB**

### 2. Create Sheets Structure

Create three sheets with the following headers:

**Sheet: `users`**
| id | username | password_hash | created_at |
|----|----------|---------------|------------|
| (empty) | (empty) | (empty) | (empty) |

**Sheet: `qr_codes`**
| id | user_id | name | target_url | short_code | created_at | updated_at |
|----|---------|------|------------|------------|------------|------------|

**Sheet: `settings`**
| key | value |
|-----|-------|
| (empty) | (empty) |

### 3. Create Google Apps Script

1. In the Sheet: **Extensions → Apps Script**
2. Delete the default code
3. Copy the entire contents of `apps-script/Code.gs` into the editor
4. Click **Save**

### 4. Deploy Apps Script as Web App

1. Click **Deploy → New Deployment**
2. Type: **Web App**
3. Execute as: **Your account**
4. Access: **Anyone**
5. Click **Deploy**
6. **Copy the URL** (looks like `https://script.google.com/macros/s/.../exec`)

### 5. Grant Permissions

Google will ask for permissions:
1. Click **Review Permissions**
2. Select your Google account
3. Click **Advanced** → **Go to QR Manager DB (unsafe)**
4. Click **Allow**

### 6. Deploy to Static Hosting

Deploy the project folder to any static host (GitHub Pages, Apache, nginx, etc.).

### 7. Deploy and Test

1. Open the hosting URL (or local ngrok URL) in your browser
2. You see the login form directly — **no configuration needed**
3. First time: enter any **username** and **password** → account is auto-created
4. Use the same username/password to login again

## 📖 Usage

### First Time Login

1. Go to the app (hosted URL or local server)
2. Enter any **username** and **password** → account is auto-created on first login
3. On subsequent logins, use the same username/password

### Create a QR Code

1. Login with your credentials
2. Click **+ Nuevo QR**
3. Enter:
   - **Nombre:** Label for the QR (e.g., "My Portfolio")
   - **URL destino:** Target URL (e.g., `https://example.com`)
4. Click **Guardar**

### View QR Code

1. Click **Ver QR** on any QR code row
2. See the QR code, redirect URL, and short code
3. Click **Copiar enlace** to copy the public redirect URL

### Share QR Code

The generated QR code encodes a URL like:
```
https://your-domain.com/r?q=DEPLOY_ID+SHORT_CODE
```

This URL works on **any device** without prior configuration. Scan it → redirects to your target URL.

### Change Password

1. Login with your credentials
2. Click **Cambiar contraseña** in the header
3. Enter your current password, new password, and confirm the new password
4. Click **Guardar**

### Edit or Delete

- **Edit:** Click **Editar** → change name/URL → **Guardar**
- **Delete:** Click **Eliminar** → confirm


## 🔗 URL Formats

### Compressed Format (current)
```
https://domain/r?q={deployId}{code}
```
- `q` parameter contains deploy ID + 8-char code (no separator)
- ~100 characters total
- Automatically generated by the app
- Works on any device without prior config

### Legacy Format (backward compatible)
```
https://domain/r?code={code}&api={fullApiUrl}
```
- Old QRs still work
- Longer URLs (~160 chars)

## 🛡️ Security

- **Passwords:** SHA-256 hashing via Web Crypto API
- **User registration:** Any username/password works on first login (auto-register)
- **Public redirect page:** Read-only, no authentication needed
- **Google Sheets:** Protected by your Google account permissions
- **API URL:** Embedded in code as base64 (obfuscation, not encryption)
- **HTTPS:** Enforced by static hosting

## 📱 Mobile & Cross-Device

The QR code contains the API URL (compressed into the `q` parameter). Scanning on **any device** works without prior configuration — the redirect page automatically decompresses the token and calls the API.

## 🔧 Development

### Local Testing with ngrok

```bash
# In the project directory
cd /path/to/coder-agent-test

# Start HTTP server on port 3000
python3 -m http.server 3000

# In another terminal, start ngrok
ngrok http 3000

# Open the ngrok URL and configure with your Apps Script URL
```

### File Structure

```
coder-agent-test/
├── index.html              # Main app (login, dashboard, modals)
├── js/
│   ├── db.js              # Google Apps Script adapter
│   ├── auth.js            # Login & password hashing (SHA-256)
│   ├── qr.js              # QR CRUD operations
│   └── app.js             # App controller & UI logic
├── r/
│   └── index.html         # Public redirect page (works on any device)
├── apps-script/
│   └── Code.gs            # Google Apps Script API
├── SETUP.md               # Detailed setup instructions
└── README.md              # This file
```

## 🚢 Deployment

### GitHub Pages
1. Push to GitHub
2. Enable Pages in repository settings
3. Access at `https://username.github.io/repo-name`

### Any Static Host
Copy all files to your static host. That's it.

## 📝 Notes

- **No database to maintain** — Google Sheets is your database
- **No backend server** — Apps Script is serverless
- **No build step** — Pure HTML/JS, works as-is
- **Always on** — Deployed once, runs forever
- **Free tier friendly** — Google Sheets + Apps Script have generous free quotas
- **Zero-config** — API URL embedded in code, no modal prompts
- **Auto-register** — First login creates account, subsequent logins validate password
- **Backward compatible** — Old QRs (`?code=...&api=...`) still work

## 🐛 Troubleshooting

### Redirect page says "API no configurada"
The QR was generated with old format (has `&api=` param).
- **Solution:** Regenerate the QR by editing and saving the QR code again.
- New QRs use compressed format with embedded API URL.

### Login fails with "invalid credentials"
The username/password combination doesn't match.
- **Solution:** Check that you're using the same username/password as first login.
- Note: User accounts are auto-created on first login, then validated on subsequent logins.

### QR code is very dense / hard to scan
The target URL is very long.
- **Solution:** Use shorter target URLs.
- The compressed format (`?q=...`) is already optimized (~31% shorter than legacy).

## 📄 License

Feel free to use and modify for your needs.

## 🙋 Support

For setup help, refer to `SETUP.md` for detailed step-by-step instructions.
