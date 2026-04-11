# TAREA-001 — QR Manager App

> Status: TESTING
> Created: 2026-04-11
> Last updated: 2026-04-12

---

## INSTRUCTIONS (Human Zone)

<!-- 
  ✏️ HUMAN-ONLY ZONE — Coder NEVER modifies this, only reads.
  Format: ### INSTRUCTIONS #N — YYYY-MM-DD
-->

### INSTRUCTIONS #0 — 2026-04-11

Crear un proyecto en JavaScript puro + jQuery (ultima version de produccion) + HTML + TailwindCSS para gestionar codigos QR.

**Autenticacion:**
- Login con usuario y password
- sql.js para SQL completo en memoria
- IndexedDB como capa de persistencia (guardar el binario .sqlite automaticamente)

**Funcionalidad principal:**
- CRUD completo para gestionar codigos QR
- Generar enlaces publicos que redirigen automaticamente a una URL indicada por el usuario

**Stack:**
- JavaScript puro (vanilla) + jQuery (CDN produccion)
- TailwindCSS (CDN)
- sql.js (WebAssembly SQL en el navegador)
- IndexedDB (persistencia del .sqlite)
- Sin backend / sin servidor — todo client-side

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #1 — 2026-04-11

#### Objective
Crear una SPA 100% client-side para gestionar codigos QR con autenticacion, CRUD completo y enlaces publicos de redireccion. Sin backend — todo en el navegador usando sql.js (SQLite en WebAssembly) persistido en IndexedDB.

#### Analysis

**Stack confirmado (todo via CDN, zero build):**
- jQuery 3.7.1 (produccion, minificado)
- TailwindCSS 3.x (CDN play)
- sql.js (WebAssembly — SQLite completo en el navegador)
- qrcode.js (generacion de QR client-side)
- Web Crypto API (hash SHA-256 para passwords, nativo del navegador)

**Modelo de datos (SQLite via sql.js):**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Persistencia:**
- sql.js opera en memoria (ArrayBuffer)
- Cada mutacion (INSERT/UPDATE/DELETE) exporta el binario completo con `db.export()`
- Se guarda en IndexedDB (store `sqlite_db`, key `app_db`)
- Al cargar la app, se lee de IndexedDB y se hidrata sql.js
- Si no existe, se crea la DB con el schema + un usuario seed (`admin`/`admin`)

**Mecanismo de enlaces publicos:**
- Cada QR tiene un `short_code` unico (8 chars aleatorios)
- `redirect.html?code=XXXXXXXX` — pagina publica que:
  1. Carga sql.js + IndexedDB
  2. Busca el `short_code` en la tabla `qr_codes`
  3. Redirige con `window.location.href` a `target_url`
  4. Si no existe, muestra error 404 estilizado
- El QR generado codifica la URL completa de `redirect.html?code=...`

**Vistas (SPA con jQuery show/hide):**
1. **Login** — formulario usuario/password, valida contra DB
2. **Dashboard** — tabla con todos los QR del usuario, botones CRUD
3. **Modal crear/editar** — formulario nombre + URL destino
4. **Vista QR** — muestra el QR generado + URL publica copiable

**Riesgos y mitigaciones:**
- *Seguridad*: hash client-side no es seguro para produccion real, pero cumple el requisito. SHA-256 via Web Crypto.
- *Tamaño WASM*: sql.js pesa ~1MB. Se carga async al inicio con spinner.
- *IndexedDB vacio*: primera carga crea schema + usuario seed automaticamente.
- *Conflictos multi-tab*: no manejado (scope del proyecto simple).

#### Action Plan

1. **Crear `index.html`** — SPA principal con:
   - CDNs: jQuery, TailwindCSS, sql.js, qrcode.js
   - Estructura HTML: login view, dashboard view, modal CRUD
   - Inline `<script>` o `<script src="js/...">` modular

2. **Crear `js/db.js`** — Capa de datos:
   - `initDB()` — carga de IndexedDB o crea nueva con schema + seed
   - `saveDB()` — exporta binario a IndexedDB
   - `runQuery(sql, params)` — wrapper para consultas
   - Auto-save despues de cada mutacion

3. **Crear `js/auth.js`** — Autenticacion:
   - `hashPassword(plain)` — SHA-256 via Web Crypto
   - `login(username, password)` — valida contra tabla `users`
   - `logout()` — limpia sesion (sessionStorage)
   - `getCurrentUser()` — retorna usuario activo

4. **Crear `js/qr.js`** — CRUD QR:
   - `listQRCodes(userId)` — SELECT con paginacion visual
   - `createQRCode(userId, name, targetUrl)` — INSERT + genera short_code
   - `updateQRCode(id, name, targetUrl)` — UPDATE
   - `deleteQRCode(id)` — DELETE
   - `generateShortCode()` — 8 chars aleatorios unicos

5. **Crear `js/app.js`** — Controlador principal:
   - Router basico (show/hide views via jQuery)
   - Event handlers para formularios y botones
   - Renderizado de tabla QR con generacion de QR visible
   - Copy-to-clipboard para URLs publicas

6. **Crear `redirect.html`** — Pagina publica de redireccion:
   - Carga minima (solo sql.js + IndexedDB read)
   - Lee `?code=` del query string
   - Busca y redirige, o muestra 404

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `index.html` | Create | SPA principal: login + dashboard + modal CRUD |
| `redirect.html` | Create | Pagina publica de redireccion por short_code |
| `js/db.js` | Create | Capa sql.js + IndexedDB (init, save, query) |
| `js/auth.js` | Create | Autenticacion (hash, login, logout, session) |
| `js/qr.js` | Create | CRUD codigos QR + generacion short_code |
| `js/app.js` | Create | Controlador SPA, routing, event handlers, render |

#### Acceptance Criteria

- [ ] Login funcional con usuario `admin` / password `admin` (seed)
- [ ] CRUD completo: crear, leer, actualizar, eliminar codigos QR
- [ ] Cada QR genera un codigo visual (imagen QR) con la URL publica
- [ ] `redirect.html?code=XXXXX` redirige correctamente a la URL destino
- [ ] Los datos persisten al recargar el navegador (IndexedDB)
- [ ] UI responsive con TailwindCSS
- [ ] Zero dependencias de servidor — funciona con `file://` o cualquier static server

#### Estimate

- Complexity: Medium-High
- Files affected: 6

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

#### Summary
Implementacion completa de la SPA QR Manager segun PLANNING #1. Todos los archivos creados, funcionalidad CRUD operativa, login con seed, persistencia IndexedDB y pagina de redireccion publica.

#### Changes Made

| File | Action | Detail |
|------|--------|--------|
| `index.html` | Created | SPA con 4 vistas: loading, login, dashboard, modales (create/edit + detail QR). CDNs: jQuery 3.7.1, TailwindCSS, sql.js 1.8.0, qrcode.js 1.0.0 |
| `redirect.html` | Created | Pagina publica: carga sql.js + IndexedDB, busca short_code, redirige o muestra 404 estilizado |
| `js/db.js` | Created | Capa DB: init sql.js con WASM CDN, schema SQL (users + qr_codes), persistencia IndexedDB bidireccional, metodos query/run/runAndSave |
| `js/auth.js` | Created | Auth: hashPassword con Web Crypto SHA-256 + fallback FNV-1a para file://, login/logout via sessionStorage |
| `js/qr.js` | Created | CRUD: create/list/get/update/remove. Short codes 8 chars via crypto.getRandomValues. Generacion URL redirect |
| `js/app.js` | Created | Controller SPA: bootstrap async, bind events jQuery delegados, renderList con cards, showDetail con QRCode.js, modal create/edit, copy-to-clipboard |

#### Technical Decisions
- **Fallback hash (FNV-1a)** para file:// protocol donde crypto.subtle no esta disponible. Web Crypto SHA-256 se usa cuando hay contexto seguro (localhost/HTTPS).
- **QR_CRUD** como nombre del modulo para evitar colision con la clase global `QRCode` de qrcode.js.
- **sql.js 1.8.0** elegido por estabilidad y disponibilidad confirmada en cdnjs.
- **Delegacion de eventos jQuery** (.on con selector) para botones renderizados dinamicamente en la lista QR.
- **IndexedDB compartida** entre index.html y redirect.html (mismo DB_NAME + STORE_NAME + KEY).

#### Status
Implementacion completada per PLANNING #1
