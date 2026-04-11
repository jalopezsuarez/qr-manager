# CONVENTIONS
> Updated: 2026-04-12

## NAMING
vars: camelCase | modules: PascalCase objects (DB, Auth, QR_CRUD, App) | files: lowercase/kebab
HTML ids: kebab-case (#qr-list, #btn-new-qr, #login-form)
CSS: TailwindCSS utility classes only, no custom CSS
DB tables (Google Sheets): snake_case (qr_codes, short_code)

## IMPORTS
N/A — no module system. Global objects via `<script>` tags.
Load order: db.js → auth.js → qr.js → app.js (dependency chain)

## FORMATTING
indent: 2 spaces | quotes: single (JS), double (HTML attributes) | semicolons: yes
no linter configured

## PATTERNS
Object literal module|all modules|const X = { method() {}, ... }
Async IIFE|entry point|$(async () => { await App.bootstrap(); })
Delegated jQuery events|dynamic DOM|$('#parent').on('click', '.child', handler)
fetch + text/plain|all API calls|Avoids CORS preflight with Apps Script
async/await|all DB operations|Every _post/_get call is async

## ANTI-PATTERNS
Never modify DOM with raw innerHTML for user input|XSS — use App.esc() or textContent
Never call DB._post before DB.init()|apiUrl is null before init
Never use crypto.subtle without HTTPS|Guaranteed by static hosting (Netlify/GH Pages)
