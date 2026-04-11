# TAREA-005 — QR URL compression: minimo de caracteres

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

quiero que la URL se comprima de la siguiente forma: `https://ngrok-domain/qr/redirect?q=434234fsfsdewr3422 y ya esta, haz lo que puedas para comprimirla al maximo pero respetando lo indicado.

### INSTRUCTIONS #0 — 2026-04-12

Comprimir al maximo la URL que se codifica en el QR para generar un codigo QR mas pequeño y facil de escanear.

**Problema actual:**
La URL generada tiene este formato:
`https://ngrok-domain/qr/redirect?code=ABCDEFGH&api=https://script.google.com/macros/s/LONGID/exec`

Son ~150 caracteres. A mas caracteres, mas densa la matriz del QR y peor la lectura con camara de movil.

**Requisito:** minimizar los caracteres de la URL sin depender de servicios externos de acortamiento (bit.ly, tinyurl, etc.).

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #2 — 2026-04-12 (reemplaza PLANNING #1)

#### Objective
Comprimir la URL del QR al maximo manteniendo el formato `https://domain/qr/redirect?q=TOKEN`.

#### Analysis — Anatomia de la URL actual

```
https://nico-unlunar-sorely.ngrok-free.dev/qr/redirect?code=ABCDEFGH&api=https://script.google.com/macros/s/AKfycb.../exec
|__________ base (~43) ___________|_ path (14) _|_ code (13) _|___________________ api (~90) ___________________|
```
**Total: ~160 chars**

El parametro `api=` repite la URL completa del Apps Script. Pero esa URL tiene partes fijas:
- Prefijo: `https://script.google.com/macros/s/` (35 chars, siempre igual)
- Sufijo: `/exec` (5 chars, siempre igual)
- Parte variable: el **deploy ID** (~84 chars)

**Conclusion:** si el token solo lleva el deploy ID desnudo + el short code, la redirect page reconstruye la URL completa. Ahorramos 48 chars de overhead fijo.

#### Solucion — Token comprimido

**Formato:** `?q={deploy_id}{short_code}`

El short_code siempre son los **ultimos 8 caracteres** del token. Todo lo anterior es el deploy ID.

```
Antes:  ?code=ABCDEFGH&api=https://script.google.com/macros/s/AKfycb.../exec
Ahora:  ?q=AKfycb...ABCDEFGH
```

La redirect page descomprime:
1. `token.slice(-8)` → short_code
2. `token.slice(0, -8)` → deploy_id
3. Reconstruye: `https://script.google.com/macros/s/{deploy_id}/exec`
4. Fetch `?action=redirect&code={short_code}` → redirige

**Comparativa final (con dominio ngrok tipico):**

| | URL | Chars |
|---|---|---|
| Antes | `https://domain/qr/redirect?code=X&api=https://script.../exec` | ~160 |
| Ahora | `https://domain/qr/redirect?q={deployId}{code}` | ~110 |
| **Ahorro** | | **~31%** |

#### Action Plan

1. **Modificar `js/db.js`** — Agregar `DB.deployId()` que extrae el deploy ID de `this.apiUrl`
2. **Modificar `js/qr.js`** — `redirectUrl()` genera `{baseUrl}/qr/redirect?q={deployId}{code}`
3. **Modificar `qr/redirect/index.html`** — Parsear `q` param, descomprimir token, reconstruir API URL, fetch y redirigir. Mantener backward compat con `?code=X&api=Y`

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `js/db.js` | Modify | Agregar `deployId()` helper |
| `js/qr.js` | Modify | `redirectUrl()` genera token comprimido |
| `qr/redirect/index.html` | Modify | Descomprime token `q`, reconstruye API URL |

#### Acceptance Criteria

- [ ] QR generado usa formato `?q=TOKEN` (sin `code=` ni `api=`)
- [ ] Escanear QR nuevo desde movil → redirige correctamente sin config previa
- [ ] QR antiguos (`?code=X&api=Y`) siguen funcionando (backward compat)
- [ ] URL del QR ~31% mas corta que la version anterior

#### Estimate

- Complexity: Low
- Files affected: 3

---

### PLANNING #1 — 2026-04-12 (superseded by PLANNING #2)

*(Apps Script direct redirect approach — descartado por instruccion del usuario: la URL debe pasar por el dominio propio con formato `/qr/redirect?q=TOKEN`)*

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

#### Summary
Compresion de URL del QR al maximo. Nuevo formato `?q={token}` donde token = deploy_id + short_code. Ahorro de ~31% en caracteres (~50 chars menos). Backward compatible con formato antiguo.

#### Changes Made

| File | Action | Detail |
|------|--------|--------|
| `js/db.js` | Modified | Agregado `deployId()` helper que extrae el deploy ID de la URL completa del Apps Script |
| `js/qr.js` | Modified | `redirectUrl()` genera token comprimido: `?q={deployId}{code}`. Fallback a formato antiguo si no hay deployId |
| `qr/redirect/index.html` | Modified | Parser: detecta `?q=` y descomprime (last 8 chars = code, rest = deployId), reconstruye API URL. Mantiene backward compat con `?code=X&api=Y` |

#### URL Compression

| Version | Ejemplo | Chars |
|---------|---------|-------|
| Antes | `https://domain/qr/redirect?code=ABCDEFGH&api=https://script.../exec` | ~160 |
| Ahora | `https://domain/qr/redirect?q=AKfycb.../ABCDEFGH` | ~110 |
| **Ahorro** | | **~50 chars (~31%)** |

#### Technical Details

- **Deploy ID extraction:** regex `/\/macros\/s\/([^/]+)\//` obtiene el ID desnudo
- **Token format:** `{deploy_id_84chars}{short_code_8chars}` sin separador
- **Decompression:** `token.slice(-8)` = code, `token.slice(0, -8)` = deployId
- **API URL reconstruction:** `https://script.google.com/macros/s/{deployId}/exec` (partes fijas codificadas)

#### Status
Implementacion completada per PLANNING #2. Los QR generados usan formato comprimido. QR antiguos siguen funcionando.
