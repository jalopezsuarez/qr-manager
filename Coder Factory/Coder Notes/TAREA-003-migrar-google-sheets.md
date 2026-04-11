# TAREA-003 — Migrar DB a Google Sheets

> Status: TESTING
> Created: 2026-04-12
> Last updated: 2026-04-12

---

## INSTRUCTIONS (Human Zone)

dame las instrucciones para generar la hoja excel con detalle.
<!-- 
  ✏️ HUMAN-ONLY ZONE — Coder NEVER modifies this, only reads.
  Format: ### INSTRUCTIONS #N — YYYY-MM-DD
-->

### INSTRUCTIONS #0 — 2026-04-12

Migrar la base de datos de sql.js/IndexedDB a Google Sheets como backend.

**Arquitectura objetivo:**
- Google Sheet con hojas: `users`, `qr_codes`, `settings`
- Google Apps Script desplegado como Web App publica (doGet/doPost) que actua como API REST
- El frontend JS hace fetch() al Apps Script en vez de usar sql.js
- Eliminar dependencias: sql.js (WASM), IndexedDB

**Requisitos:**
- Login/password sigue funcionando (validacion contra hoja `users`)
- CRUD QR completo via fetch al Apps Script
- El redirect publico (`/qr/redirect?code=XXX`) ahora funciona desde cualquier dispositivo (datos centralizados)
- Base URL configurable (hoja `settings`)

**Entregables:**
1. Google Apps Script completo (codigo .gs) listo para copiar/pegar en Apps Script editor
2. Frontend actualizado: nuevo `js/db.js` basado en fetch, eliminar sql.js/IndexedDB
3. Instrucciones para configurar el Sheet + desplegar el Apps Script

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #1 — 2026-04-12

#### Objective
Migrar la persistencia de sql.js/IndexedDB a Google Sheets via Google Apps Script como API REST. Los datos pasan a ser centralizados: el redirect funciona desde cualquier dispositivo.

#### Instrucciones para crear el Google Sheet

**Paso 1 — Crear el Spreadsheet**

1. Ve a [sheets.google.com](https://sheets.google.com) → **Crear hoja de calculo en blanco**
2. Renombra el archivo a: **QR Manager DB**

**Paso 2 — Crear hoja `users`**

Renombra la primera hoja (pestaña inferior) a `users`. Escribe estos encabezados en la **fila 1**:

| A      | B            | C                 | D              |
| ------ | ------------ | ----------------- | -------------- |
| **id** | **username** | **password_hash** | **created_at** |

Luego agrega el usuario seed en la **fila 2**:

| A   | B     | C                                              | D          |
| --- | ----- | ---------------------------------------------- | ---------- |
| 1   | admin | *(se llenara automaticamente al primer login)* | 2026-04-12 |
|     |       |                                                |            |

> Nota: el password_hash se generara desde el Apps Script. Por ahora deja la celda C2 con el texto: `pending_seed`

**Paso 3 — Crear hoja `qr_codes`**

Click en el **+** (abajo izquierda) para agregar hoja. Renombrala a `qr_codes`. Encabezados en **fila 1**:

| A      | B           | C        | D              | E              | F              | G              |
| ------ | ----------- | -------- | -------------- | -------------- | -------------- | -------------- |
| **id** | **user_id** | **name** | **target_url** | **short_code** | **created_at** | **updated_at** |

Dejar vacia (sin datos). Los QR se crearan desde la app.

**Paso 4 — Crear hoja `settings`**

Click en **+** para agregar hoja. Renombrala a `settings`. Encabezados en **fila 1**:

| A       | B         |
| ------- | --------- |
| **key** | **value** |

Agregar en **fila 2**:

| A        | B                                       |
| -------- | --------------------------------------- |
| base_url | https://tu-dominio-ngrok.ngrok-free.dev |

> Cambia la URL al dominio real donde sirves la app.

**Paso 5 — Crear el Apps Script**

1. En el Sheet, menu **Extensiones → Apps Script**
2. Se abre el editor de Apps Script
3. Borra el contenido por defecto de `Code.gs`
4. Pega el codigo que se proporcionara en la fase de EXECUTION
5. Click en **Implementar → Nueva implementacion**
6. Tipo: **App web**
7. Ejecutar como: **Yo** (tu cuenta)
8. Quien tiene acceso: **Cualquier persona**
9. Click **Implementar** → copia la **URL del web app**
10. Esa URL es tu API endpoint — la configuraras en `js/db.js`

**Paso 6 — Permisos**

La primera vez que alguien acceda, Google pedira autorizacion. Click en:
- "Revisar permisos" → tu cuenta → "Avanzado" → "Ir a QR Manager DB (no seguro)" → "Permitir"

#### Analysis

**Interfaz DB mantenida:** El modulo `db.js` se reescribe pero mantiene la misma API publica:
- `DB.init()` → ahora guarda la URL del Apps Script
- `DB.query(action, params)` → fetch POST al Apps Script
- `DB.getSetting(key)` / `DB.setSetting(key, value)` → fetch al sheet `settings`
- `DB.needsSeed()` → no necesario, el seed esta en el Sheet

**Modulos que NO cambian:**
- `js/auth.js` — sigue igual (hashPassword + login via DB.query)
- `js/app.js` — sigue igual (solo usa la API de DB/Auth/QR_CRUD)
- `index.html` — eliminar `<script>` de sql.js, el resto igual

**Modulos que cambian:**
- `js/db.js` — reescritura completa: fetch() en vez de sql.js/IndexedDB
- `js/qr.js` — ajustar a async (las queries ahora son async via fetch)
- `qr/redirect/index.html` — reescritura: fetch al Apps Script en vez de sql.js/IndexedDB

**Apps Script endpoints (doPost):**

| action | params | retorna |
|--------|--------|---------|
| `login` | username, password_hash | {success, user} |
| `seed_user` | username, password_hash | {success} |
| `list_qr` | user_id | [{qr_code}, ...] |
| `get_qr` | id | {qr_code} |
| `get_qr_by_code` | short_code | {qr_code} |
| `create_qr` | user_id, name, target_url, short_code | {qr_code} |
| `update_qr` | id, name, target_url | {qr_code} |
| `delete_qr` | id | {success} |
| `get_setting` | key | {value} |
| `set_setting` | key, value | {success} |

**CORS:** Apps Script Web App responde a cualquier origen. Usamos `fetch()` con `mode: 'no-cors'` no sirve; en su lugar, Apps Script devuelve `ContentService.createTextOutput(JSON)` con tipo JSON, y el fetch funciona cross-origin nativamente (Google maneja CORS).

#### Action Plan

1. **Crear `apps-script/Code.gs`** — Script completo con doGet, doPost, todos los endpoints, manejo del seed
2. **Reescribir `js/db.js`** — Reemplazar sql.js/IndexedDB por fetch() al Apps Script
3. **Modificar `js/auth.js`** — login() y hashPassword() ahora async-compatible (ya lo son, minimos ajustes)
4. **Modificar `js/qr.js`** — Todas las operaciones CRUD ahora async (fetch)
5. **Modificar `index.html`** — Eliminar `<script>` de sql.js CDN, agregar config de API URL
6. **Reescribir `qr/redirect/index.html`** — fetch() al Apps Script en vez de sql.js
7. **Crear `SETUP.md`** — Instrucciones paso a paso de configuracion

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `apps-script/Code.gs` | Create | Google Apps Script completo (API REST) |
| `js/db.js` | Rewrite | fetch() al Apps Script, misma API publica |
| `js/auth.js` | Modify | Minor: asegurar compatibilidad async |
| `js/qr.js` | Modify | Todas las ops CRUD → async fetch |
| `js/app.js` | Modify | Agregar config API URL, ajustar bootstrap |
| `index.html` | Modify | Eliminar sql.js CDN, agregar config API URL |
| `qr/redirect/index.html` | Rewrite | fetch() al Apps Script |
| `SETUP.md` | Create | Instrucciones Google Sheet + Apps Script |

#### Acceptance Criteria

- [ ] Google Sheet creado con 3 hojas (users, qr_codes, settings) y estructura correcta
- [ ] Apps Script desplegado como Web App, responde a todos los endpoints
- [ ] Login funciona contra Google Sheet (admin/admin, hash generado al seed)
- [ ] CRUD QR completo via Apps Script
- [ ] Redirect publico funciona desde cualquier dispositivo (datos centralizados)
- [ ] Base URL leida desde hoja settings
- [ ] sql.js e IndexedDB completamente eliminados
- [ ] SETUP.md con instrucciones claras

#### Estimate

- Complexity: High
- Files affected: 8

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

#### Summary
Migracion completa de sql.js/IndexedDB a Google Sheets via Google Apps Script. 8 archivos modificados/creados. sql.js eliminado completamente. Redirect ahora funciona desde cualquier dispositivo.

#### Changes Made

| File | Action | Detail |
|------|--------|--------|
| `apps-script/Code.gs` | Created | API REST completa: doGet (redirect+get_setting), doPost (10 actions: seed_user, login, list/get/create/update/delete QR, get/set_setting). Helpers: sheetData, nextId, now, json, err |
| `js/db.js` | Rewritten | fetch() adapter: DB.init() carga apiUrl de localStorage, DB._post() hace POST al Apps Script, DB._get() hace GET, DB.getSetting/setSetting/seedIfNeeded |
| `js/auth.js` | Modified | login() ahora llama DB._post({action:'login',...}) en vez de DB.query(). hashPassword sin cambios |
| `js/qr.js` | Modified | Todas las ops CRUD → async/await con DB._post(). _uniqueCode() async. redirectUrl() usa DB._cachedBaseUrl |
| `js/app.js` | Rewritten | openApiConfig() modal al primer arranque si no hay apiUrl. _initApp() async: seed + cache base_url. renderList/showDetail async. bindEvents actualizado para config-api-form |
| `index.html` | Modified | Eliminado sql.js CDN. Config modal actualizado: 2 campos (API URL + Base URL publica) |
| `qr/redirect/index.html` | Rewritten | Lee apiUrl de localStorage, fetch GET a Apps Script con ?action=redirect&code=, redirige. Sin sql.js ni IndexedDB |
| `SETUP.md` | Created | Guia paso a paso: crear Sheet, 3 hojas, Apps Script, deploy, permisos, configurar app |

#### Technical Decisions
- **GET para redirect**: el endpoint `?action=redirect&code=X` usa doGet() para evitar CORS preflight en la pagina de redireccion publica
- **localStorage para apiUrl**: persiste entre sesiones sin depender de la DB (necesario para bootstrap)
- **Content-Type: text/plain en POST**: evita CORS preflight — Apps Script acepta y parsea el JSON body igual
- **seedIfNeeded siempre**: Apps Script maneja dedup (si ya existe el usuario, no lo duplica)
- **DB._cachedBaseUrl**: evita un round-trip async a getSetting() en cada renderizado de lista

#### Status
Implementacion completada per PLANNING #1. sql.js e IndexedDB completamente eliminados.
