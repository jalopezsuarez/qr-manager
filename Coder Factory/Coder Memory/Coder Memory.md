# CODER MEMORY INDEX
> Updated: 2026-04-12
> Project: coder-agent-test (QR Manager)

## TECH STACK
JavaScript(vanilla)|ES2020+|jQuery 3.7.1|none(CDN)|Google Sheets(backend)|Google Apps Script(API)
TailwindCSS 3.x (CDN play)|qrcodejs 1.0.0 (CDN)|Web Crypto API (SHA-256 only)
Zero build — all CDN, static files only, serverless backend

## STRUCTURE
coder-agent-test/
├── index.html               → SPA principal (login+dashboard+modals)
├── js/
│   ├── db.js                → Google Apps Script fetch() adapter
│   ├── auth.js              → Login/logout, SHA-256 hash
│   ├── qr.js                → CRUD QR codes, short_code gen, compressed URLs
│   └── app.js               → SPA controller, events, render
├── qr/redirect/index.html   → Public redirect page (decompresses token)
├── apps-script/Code.gs      → Google Apps Script API (doGet/doPost)
├── netlify.toml             → Netlify routing config
├── SETUP.md                 → Setup guide (Sheets + Netlify Drop)
├── README.md                → Project documentation
├── Coder Factory/           → Agent workspace (memory+board+notes)
└── templates/               → Task note template

## MODULE REGISTRY
db|js/db.js|fetch() adapter: _post/_get to Apps Script, localStorage apiUrl, deployId()|Google Apps Script|active
auth|js/auth.js|SHA-256 hash, login, logout, session (sessionStorage)|db|active
qr|js/qr.js|CRUD qr_codes, short_code gen, compressed redirect URL|db|active
app|js/app.js|SPA bootstrap, jQuery events, view routing, render, config modal|db,auth,qr,QRCode|active
redirect|qr/redirect/index.html|Standalone: decompress ?q= token, fetch Apps Script, redirect|fetch|active
api|apps-script/Code.gs|REST API: doGet (redirect, get_setting), doPost (10 actions)|Google Sheets|active

## ACTIVE DECISIONS
D001|2026-04-12|Base URL = window.location.origin|Auto-detected on HTTPS static hosting, no manual config|settings table approach rejected (TAREA-004)
D002|2026-04-12|SHA-256 only (no FNV fallback)|HTTPS guaranteed on static hosting, crypto.subtle always available|FNV-1a removed (TAREA-004)
D003|2026-04-12|Google Sheets via Apps Script as backend|Centralized data, works from any device, no server needed|sql.js/IndexedDB removed (TAREA-003)
D004|2026-04-12|Compressed QR URLs: ?q={deployId}{code}|31% shorter URLs, easier QR scanning, API URL stripped to bare deploy ID|full URL in params rejected (TAREA-005)
D005|2026-04-12|Content-Type: text/plain for POST|Avoids CORS preflight to Apps Script|application/json requires preflight

## CURRENT STATE
works: login(admin/admin), CRUD QR, QR image gen, copy URL, compressed redirect, cross-device QR scan, Netlify deploy
pending: TAREA-006 (embed API URL), TAREA-007 (auto-create user)
done: TAREA-001, TAREA-002, TAREA-003, TAREA-004, TAREA-005

## DOMAIN FILES
architecture.md|architecture & data flow|2026-04-12
modules.md|module map & exports|2026-04-12
conventions.md|code style|2026-04-12
dependencies.md|CDN packages & scripts|2026-04-12
knowledge-graph.md|symbol graph & call chains|2026-04-12
