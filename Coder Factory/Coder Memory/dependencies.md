# DEPENDENCIES
> Updated: 2026-04-12

## PACKAGES
jQuery|3.7.1|DOM manipulation, events|no|https://code.jquery.com/jquery-3.7.1.min.js
TailwindCSS|3.x (play CDN)|Utility CSS framework|no|https://cdn.tailwindcss.com
qrcodejs|1.0.0|QR code image generation (canvas/img)|no|https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js

## REMOVED (TAREA-003)
sql.js|1.8.0|Replaced by Google Sheets backend
IndexedDB|browser API|No longer needed

## SCRIPTS
python3 -m http.server 3000|Local development server (optional)
ngrok http 3000|Tunnel for testing (optional)
Netlify Drop|Production deployment — drag folder to app.netlify.com/drop

## BACKEND
Google Apps Script|Web App|REST API for CRUD + redirect
Google Sheets|3 sheets: users, qr_codes, settings|Database

## ENV VARS
N/A — no env vars, no build, no .env files. API URL in localStorage (gs_api_url).
