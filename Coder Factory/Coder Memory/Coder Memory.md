# CODER MEMORY INDEX
> Updated: 2026-04-12 00:15
> Agent: v0.202604112034
> Project: coder-agent-test (QR Manager)

## TECH STACK
JavaScript(vanilla)|ES2020+|jQuery 3.7.1|none(CDN)|SQLite(sql.js 1.8.0 WASM)|IndexedDB
TailwindCSS 3.x (CDN play)|qrcodejs 1.0.0 (CDN)|Web Crypto API (SHA-256)
Zero build — all CDN, static files only, no backend

## STRUCTURE
coder-agent-test/
├── index.html               → SPA principal (login+dashboard+modals) 189L
├── js/
│   ├── db.js                → sql.js+IndexedDB persistence layer 140L
│   ├── auth.js              → Login/logout, SHA-256+FNV fallback 44L
│   ├── qr.js                → CRUD QR codes, short_code gen 63L
│   └── app.js               → SPA controller, events, render 226L
├── qr/redirect/index.html   → Public redirect page 95L
├── Coder Factory/            → Agent workspace (memory+board+notes)
└── templates/                → Task note template

## MODULE REGISTRY
db|js/db.js|sql.js init, IndexedDB R/W, schema, query/run, settings KV|sql.js,IndexedDB|active
auth|js/auth.js|hash, login, logout, session (sessionStorage)|db|active
qr|js/qr.js|CRUD qr_codes, short_code gen, redirect URL build|db|active
app|js/app.js|SPA bootstrap, jQuery events, view routing, render|db,auth,qr,QRCode|active
redirect|qr/redirect/index.html|Standalone: load sql.js+IDB, lookup short_code, redirect|sql.js,IndexedDB|active

## ACTIVE DECISIONS
D001|2026-04-12|Base URL configurable via settings table|URLs were file:// on local, now read from DB.settings('base_url')|hardcoded window.location rejected
D002|2026-04-11|FNV-1a fallback hash for file://|crypto.subtle unavailable in non-secure contexts|plain-text storage rejected
D003|2026-04-11|sql.js 1.8.0 via cdnjs|Stability + confirmed CDN availability|newer versions untested on cdnjs

## CURRENT STATE
works: login(admin/admin), CRUD QR, QR image gen, copy URL, redirect page, configurable base URL, IndexedDB persistence
pending: TAREA-001 testing, TAREA-002 testing
in-progress: ---

## DOMAIN FILES
architecture.md|architecture & patterns|2026-04-12
modules.md|module map & exports|2026-04-12
conventions.md|code style|2026-04-12
dependencies.md|CDN packages & scripts|2026-04-12
knowledge-graph.md|symbol graph & call chains|2026-04-12
