# ARCHITECTURE
> Updated: 2026-04-12

## PATTERNS
SPA show/hide|index.html|jQuery toggle views instead of routing lib — zero deps
Object-literal modules|js/*.js|DB, Auth, QR_CRUD, App as plain objects — no classes, no build
Delegated events|app.js|jQuery .on(event, selector) for dynamic DOM elements
Async bootstrap|app.js|$(async()=>{await App.bootstrap()}) entry point

## DATA FLOW
index.html → App.bootstrap() → DB.init() → sql.js WASM load → IndexedDB read/create
User login → Auth.login() → DB.query(users) → sessionStorage
QR CRUD → QR_CRUD.create/update/remove() → DB.runAndSave() → IndexedDB persist
QR view → QRCode.js render → redirectUrl() → DB.getSetting('base_url')
Redirect → qr/redirect/index.html → sql.js init → IndexedDB read → lookup → window.location.href

## API SURFACE
N/A — no backend, no HTTP API. All client-side SQLite queries.

## ERROR STRATEGY
bootstrap|try/catch, show error in #loading-text|App.bootstrap()
DB load|fallback: create new DB if IDB empty|DB.init()
hash|fallback: FNV-1a if crypto.subtle unavailable|Auth.hashPassword()
redirect|show "not found" page if code missing/invalid|qr/redirect/index.html
