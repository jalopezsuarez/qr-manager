# TAREA-002 — Fix redirect URL publica

> Status: TESTING
> Created: 2026-04-12
> Last updated: 2026-04-12

---

## INSTRUCTIONS (Human Zone)

<!-- 
  ✏️ HUMAN-ONLY ZONE — Coder NEVER modifies this, only reads.
  Format: ### INSTRUCTIONS #N — YYYY-MM-DD
-->

### INSTRUCTIONS #0 — 2026-04-12

El enlace publico de redireccion genera una URL con file:// en lugar de http://. Ejemplo actual erroneo:

```
file:///Users/000-jlopez/Library/CloudStorage/Dropbox/Apps/remotely-save/Empresa/10%20Proyectos/Factory/coder-agent-test/redirect.html?code=EC2yUPUJ
```

**Lo que debe hacer:**
- La URL publica debe usar `http://baseurl` (la misma base URL del proyecto)
- El path debe ser: `/qr/redirect` en vez de `redirect.html?code=`
- Formato correcto: `http://<baseurl>/qr/redirect?code=XXXXXXXX`

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #1 — 2026-04-12

#### Objective
Corregir la generacion de URLs publicas de redireccion. Actualmente usa `window.location.href` que produce `file:///...`. Debe generar URLs HTTP con path `/qr/redirect?code=XXXXXXXX` usando una base URL configurable.

#### Analysis

**Causa raiz:** `qr.js:58-61` — `redirectUrl()` construye la URL con `window.location.href.replace(...)`, que en contexto local da `file:///...`.

**Problema doble:**
1. Protocolo incorrecto (`file://` en vez de `http://`)
2. Path incorrecto (`redirect.html?code=` en vez de `/qr/redirect?code=`)

**Solucion: Base URL configurable + reestructurar redirect**

- Tabla `settings` en SQLite para guardar la base URL
- Campo configurable en el dashboard para que el usuario defina su URL base (ej: `http://midominio.com`)
- Mover `redirect.html` a `qr/redirect/index.html` para que el path sea `/qr/redirect`
- `redirectUrl()` usa la base URL guardada + `/qr/redirect?code=XXXXXXXX`

**Flujo:**
1. Primera carga: base URL por defecto = `window.location.origin` (funciona en HTTP, fallback `http://localhost:3000` para file://)
2. Usuario puede cambiar base URL desde un boton config en el dashboard
3. Se persiste en tabla `settings` via sql.js + IndexedDB
4. Todos los QR generados usan esa base URL

#### Action Plan

1. **Modificar `js/db.js`** — Agregar tabla `settings` al schema + helpers `getSetting(key)` / `setSetting(key, value)`
2. **Modificar `js/qr.js`** — `redirectUrl()` lee base URL de settings + usa path `/qr/redirect?code=`
3. **Modificar `js/app.js`** — Agregar UI para configurar base URL (modal o inline en header) + inicializar default en bootstrap
4. **Modificar `index.html`** — Agregar boton config + modal/inline para base URL
5. **Mover `redirect.html`** → crear `qr/redirect/index.html` (misma logica, nueva ubicacion)
6. **Eliminar** `redirect.html` del root

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `js/db.js` | Modify | Agregar tabla settings + getSetting/setSetting |
| `js/qr.js` | Modify | redirectUrl() usa DB settings en vez de window.location |
| `js/app.js` | Modify | Config base URL UI + default en bootstrap |
| `index.html` | Modify | Boton config + modal base URL en dashboard |
| `qr/redirect/index.html` | Create | Redirect page en nueva ubicacion |
| `redirect.html` | Delete | Reemplazado por qr/redirect/index.html |

#### Acceptance Criteria

- [ ] URL generada tiene formato `http://<baseurl>/qr/redirect?code=XXXXXXXX`
- [ ] Base URL configurable desde el dashboard
- [ ] Base URL persiste al recargar (guardada en SQLite/IndexedDB)
- [ ] `/qr/redirect?code=XXXXXXXX` redirige correctamente
- [ ] QR codes existentes regeneran URL correcta con nueva base URL

#### Estimate

- Complexity: Low-Medium
- Files affected: 6

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

#### Summary
Fix completo de URLs de redireccion. Base URL configurable via tabla `settings` en SQLite, path cambiado a `/qr/redirect?code=`, redirect page movida a `qr/redirect/index.html`.

#### Changes Made

| File | Action | Detail |
|------|--------|--------|
| `js/db.js` | Modified | +tabla `settings` (key/value), +`_ensureSettingsTable()` para DBs existentes, +`getSetting(key)`, +`setSetting(key, value)` |
| `js/qr.js` | Modified | `redirectUrl()` lee `base_url` de settings, fallback a `window.location.origin` o `http://localhost:3000`, path: `/qr/redirect?code=` |
| `js/app.js` | Modified | Bootstrap inicializa `base_url` default si no existe. +Eventos config modal: open, save, cancel |
| `index.html` | Modified | +Boton config (icono engranaje) en header. +Modal config con campo URL + ayuda |
| `qr/redirect/index.html` | Created | Copia de redirect.html en nueva ubicacion para path `/qr/redirect` |
| `redirect.html` | Deleted | Reemplazado por `qr/redirect/index.html` |

#### Technical Decisions
- `_ensureSettingsTable()` garantiza compatibilidad con DBs creadas antes de este fix (sin tabla settings)
- Default base URL: `window.location.origin` en HTTP, `http://localhost:3000` en file://
- Trailing slashes eliminados automaticamente del base URL al guardar

#### Status
Implementacion completada per PLANNING #1
