# ARCHITECTURE
> Updated: 2026-04-12

## PATTERNS
SPA show/hide|index.html|jQuery toggle views instead of routing lib — zero deps
Object-literal modules|js/*.js|DB, Auth, QR_CRUD, App as plain objects — no classes, no build
Delegated events|app.js|jQuery .on(event, selector) for dynamic DOM elements
Async bootstrap|app.js|$(async()=>{await App.bootstrap()}) entry point
Serverless backend|apps-script/Code.gs|Google Apps Script as REST API, Google Sheets as DB

## DATA FLOW
index.html → App.bootstrap → DB.init → check localStorage(gs_api_url) → show config or _initApp
_initApp → Auth.hashPassword('admin') → DB.seedIfNeeded → DB._cachedBaseUrl = window.location.origin
User login → Auth.login → Auth.hashPassword(SHA-256) → DB._post({action:'login',...}) → sessionStorage
QR CRUD → QR_CRUD.create/update/remove → DB._post → Apps Script → Google Sheet
QR view → QRCode.js render → redirectUrl() → compressed token: {deployId}{code}
Redirect → qr/redirect/index.html → parse ?q= → decompress(deployId+code) → fetch Apps Script → redirect

## API SURFACE
Google Apps Script REST API:
  GET:  ?action=redirect&code=X → {target_url}
  GET:  ?action=get_setting&key=X → {value}
  POST: action=seed_user|login|list_qr|get_qr|get_qr_by_code|create_qr|update_qr|delete_qr|get_setting|set_setting
  Content-Type: text/plain (avoids CORS preflight)
  Response: JSON {success, ...data} or {success:false, error}

## ERROR STRATEGY
bootstrap|try/catch, show error in #loading-text|App.bootstrap()
API calls|DB._post/_get throw on !success, caught by callers|db.js
hash|SHA-256 only (HTTPS guaranteed)|Auth.hashPassword()
redirect|show "not found" if code missing/invalid, "API no configurada" if no apiUrl|qr/redirect/index.html
seed|seedUser updates hash if not valid SHA-256 (covers pending_seed, fnv_ migration)|Code.gs

## QR URL COMPRESSION
Format: ?q={deploy_id}{short_code_8chars}
Encode: strip https://script.google.com/macros/s/ prefix and /exec suffix from API URL
Decode: token.slice(-8) = code, token.slice(0,-8) = deployId → reconstruct full URL
Savings: ~31% fewer chars (~50 chars less)
