# MODULES
> Updated: 2026-04-12

## db
path: js/db.js (140L)
exports: DB {init, query, run, runAndSave, save, needsSeed, getSetting, setSetting}
depends: initSqlJs (CDN global), IndexedDB (browser API)
tested: no
notes: Tables: users, qr_codes, settings. IDB store: qr_manager_db/databases/main. _ensureSettingsTable() for backward compat with DBs created before settings table existed.

## auth
path: js/auth.js (44L)
exports: Auth {hashPassword, login, logout, currentUser, isLoggedIn}
depends: DB.query, crypto.subtle (browser), sessionStorage
tested: no
notes: SHA-256 via Web Crypto, FNV-1a fallback for file:// protocol. Session in sessionStorage (tab-scoped).

## qr
path: js/qr.js (63L)
exports: QR_CRUD {create, list, get, getByCode, update, remove, redirectUrl}
depends: DB.query, DB.runAndSave, DB.getSetting, crypto.getRandomValues
tested: no
notes: Named QR_CRUD to avoid collision with QRCode global. Short codes: 8 chars [a-zA-Z0-9] via crypto.getRandomValues. redirectUrl reads base_url from settings table.

## app
path: js/app.js (226L)
exports: App {bootstrap, bindEvents, showLogin, showDashboard, renderList, showDetail, openModal, closeModal, esc}
depends: DB, Auth, QR_CRUD, QRCode (CDN global), jQuery ($)
tested: no
notes: Entry: $(async()=>App.bootstrap()). Views: loading, login, dashboard. Modals: QR create/edit, QR detail, config base URL. All events via jQuery delegation.

## redirect
path: qr/redirect/index.html (95L)
exports: N/A (standalone page)
depends: initSqlJs (CDN), IndexedDB (browser API, same DB as main app)
tested: no
notes: Minimal page. Reads ?code= param, loads sql.js+IDB, queries qr_codes by short_code, redirects or shows 404. Shares IndexedDB with main app (same origin required).
