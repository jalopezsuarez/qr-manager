# MODULES
> Updated: 2026-04-12

## db
path: js/db.js
exports: DB {init, setApiUrl, hasApiUrl, _post, _get, seedIfNeeded, needsSeed, getSetting, setSetting, deployId}
depends: localStorage (gs_api_url), fetch API
tested: no
notes: Google Apps Script adapter. apiUrl in localStorage. _post with Content-Type: text/plain to avoid CORS preflight. deployId() extracts deploy ID from API URL via regex. _cachedBaseUrl set by app.js.

## auth
path: js/auth.js
exports: Auth {hashPassword, login, logout, currentUser, isLoggedIn}
depends: DB._post, crypto.subtle (SHA-256), sessionStorage
tested: no
notes: SHA-256 only (no FNV fallback). Session in sessionStorage (tab-scoped). login() posts to Apps Script, stores user in sessionStorage.

## qr
path: js/qr.js
exports: QR_CRUD {create, list, get, getByCode, update, remove, redirectUrl}
depends: DB._post, DB.deployId, DB._cachedBaseUrl, crypto.getRandomValues
tested: no
notes: Short codes: 8 chars [a-zA-Z0-9]. redirectUrl() generates compressed token: ?q={deployId}{code}. Falls back to old format (?code=X&api=Y) if deployId unavailable.

## app
path: js/app.js
exports: App {bootstrap, _initApp, bindEvents, showLogin, showDashboard, renderList, showDetail, openModal, closeModal, openApiConfig, esc}
depends: DB, Auth, QR_CRUD, QRCode (CDN global), jQuery ($)
tested: no
notes: Entry: $(async()=>App.bootstrap()). Config modal: API URL only (no base URL). Base URL = window.location.origin (auto-detected). Seeds admin user on init.

## redirect
path: qr/redirect/index.html
exports: N/A (standalone page)
depends: fetch API, URLSearchParams
tested: no
notes: Two formats: new ?q={token} (decompresses deployId+code, reconstructs API URL) and legacy ?code=X&api=Y. No sql.js, no IndexedDB. Pure fetch to Apps Script GET endpoint.

## api
path: apps-script/Code.gs
exports: doGet, doPost (10 actions), helpers (sheet, sheetData, nextId, now, json, err)
depends: Google Sheets (SpreadsheetApp), ContentService, Utilities
tested: manual
notes: seedUser updates hash if not valid SHA-256 regex (handles pending_seed, fnv_ migration). login compares username+password_hash. CRUD uses sheetData() helper. Settings as key-value pairs.
