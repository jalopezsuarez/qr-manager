# TAREA-006 — Embeber API URL en el codigo (no pedir al usuario)

> Status: TESTING
> Last updated: 2026-04-12
> Created: 2026-04-12
> Last updated: 2026-04-12

---

## INSTRUCTIONS (Human Zone)

<!-- 
  ✏️ HUMAN-ONLY ZONE — Coder NEVER modifies this, only reads.
  Format: ### INSTRUCTIONS #N — YYYY-MM-DD
-->

### INSTRUCTIONS #0 — 2026-04-12

No quiero que la app pida la URL del Apps Script cada vez. Guardarla encriptada o codificada directamente en el codigo para que no haya que introducirla nunca.

La URL actual es:
`https://script.google.com/macros/s/AKfycbxyFcLnVzcLFL-Ib8-BUsaoDtCvc0X-RmOxKSjpNrLIv46G8fa-sapgfrJO0dWeFM2N/exec`

Eliminar el modal de configuracion de API URL. La app debe funcionar directamente al abrir, sin ningun paso de configuracion previo.

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #1 — 2026-04-12

#### Objective
Embeber la API URL codificada en base64 directamente en el codigo. Eliminar el modal de configuracion y el boton de engranaje. La app arranca sin ningun paso de configuracion.

#### Analysis

**Estado actual:**
- `db.js`: `init()` lee `gs_api_url` de localStorage → si no existe, `bootstrap()` muestra modal config
- `app.js`: `openApiConfig()` muestra modal, `bindEvents()` tiene handlers del config form
- `index.html`: modal `#config-modal` con campo API URL, boton engranaje `#btn-config`
- `qr/redirect/index.html`: fallback a `localStorage.getItem('gs_api_url')` para QRs sin `?q=`

**Solucion:** Codificar la URL en base64 (ofuscacion simple, no seguridad). `atob()` la decodifica al iniciar. Eliminar localStorage, config modal, y todo el flujo de configuracion.

La URL codificada en base64:
```
https://script.google.com/macros/s/AKfycbxyFcLnVzcLFL-Ib8-BUsaoDtCvc0X-RmOxKSjpNrLIv46G8fa-sapgfrJO0dWeFM2N/exec
→ aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4eUZjTG5WemNMRkwtSWI4LUJVY2FvRHRDdmMwWC1SbU94S1NqcE5yTEl2NDZHOGZhLXNhcGdmckpPMGRXZUZNMk4vZXhlYw==
```

#### Action Plan

1. **`js/db.js`** — Constante `_API_B64` con la URL en base64. `init()` = `this.apiUrl = atob(_API_B64)`. Eliminar `setApiUrl`, `hasApiUrl`, localStorage.
2. **`js/app.js`** — `bootstrap()` directo a `_initApp()` (sin check `hasApiUrl`). Eliminar `openApiConfig()`. Eliminar handlers de config form en `bindEvents()`.
3. **`index.html`** — Eliminar modal `#config-modal` completo. Eliminar boton engranaje `#btn-config` del header.
4. **`qr/redirect/index.html`** — Reemplazar fallback `localStorage.getItem('gs_api_url')` por `atob('...')` hardcoded.

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `js/db.js` | Modify | API URL en base64, eliminar localStorage/setApiUrl/hasApiUrl |
| `js/app.js` | Modify | Eliminar config modal logic, simplificar bootstrap |
| `index.html` | Modify | Eliminar config modal HTML + boton engranaje |
| `qr/redirect/index.html` | Modify | Fallback con API URL hardcoded en base64 |

#### Acceptance Criteria

- [ ] La app arranca directamente al login (sin modal de configuracion)
- [ ] No hay boton de engranaje en el header
- [ ] No se usa localStorage para la API URL
- [ ] La URL del API esta codificada en base64, no en texto plano
- [ ] QR redirect funciona sin localStorage (API URL hardcoded como fallback)

#### Estimate

- Complexity: Low
- Files affected: 4

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

API URL codificada en base64 en `db.js`. Eliminado modal config, boton engranaje, y localStorage.

| Archivo | Cambio |
|---------|--------|
| `js/db.js` | `_API_B64` constante, `init()` decodifica con `atob()`, eliminado `setApiUrl()`, `hasApiUrl()`, `seedIfNeeded()`, `needsSeed()` |
| `js/app.js` | `bootstrap()` directo a `_initApp()` (sin check config), eliminado `openApiConfig()`, handlers config form |
| `index.html` | Eliminado modal config, boton engranaje, cambio de texto en login |
| `qr/redirect/index.html` | Fallback con `atob()` hardcoded, solo param `?q=` o legacy `?code=X&api=Y` |

App arranca directamente al login. Zero-config deployment.
