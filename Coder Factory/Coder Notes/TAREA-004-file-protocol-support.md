# TAREA-004 — Soporte completo file:// sin servidor

> Status: TESTING
> Created: 2026-04-12
> Last updated: 2026-04-12

---

## INSTRUCTIONS (Human Zone)

no quiero que funcione en file:// quiero que funcione con solo frontend html javascript front, me da igual lo de file:// tiene que ser http:// o https://
<!-- 
  ✏️ HUMAN-ONLY ZONE — Coder NEVER modifies this, only reads.
  Format: ### INSTRUCTIONS #N — YYYY-MM-DD
-->

### INSTRUCTIONS #0 — 2026-04-12

La app debe funcionar completamente haciendo doble-clic en `index.html`, sin necesidad de npx, python o ningun servidor HTTP.

**Requisitos:**
- Abrir `index.html` directamente desde el sistema de archivos (`file://`) debe funcionar al 100%
- Backend: Google Sheets via Apps Script (ya implementado en TAREA-003)
- Sin sql.js, sin IndexedDB, sin servidor local
- El boton "Copiar URL" debe funcionar en file://
- El hash de password debe funcionar en file:// (ya tiene fallback FNV, verificar que es consistente)
- El redirect publico (`qr/redirect/index.html`) tambien debe abrir desde file:// y redirigir correctamente
- Eliminar cualquier referencia o instruccion que mencione npx / servidor en la UI

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #2 — 2026-04-12 (reemplaza PLANNING #1)

#### Objective
La app es un frontend puro (HTML/JS) que se despliega una vez en un hosting estatico gratuito (Netlify, GitHub Pages, etc.) y funciona permanentemente via HTTP/HTTPS sin ningun servidor local. El backend es Google Sheets via Apps Script.

#### Analysis — Que cambia respecto a PLANNING #1

PLANNING #1 resolvia problemas de `file://`. Ese scope queda descartado. El problema real es mas simple:

**La app YA ES frontend puro** — no tiene servidor, no tiene build, son archivos estaticos. Solo faltaba saber donde servirla sin npx.

**Solucion: despliegue en hosting estatico gratuito.**

Opcion recomendada: **Netlify Drop** — arrastras la carpeta, obtienes una URL HTTPS permanente en 30 segundos. Sin cuenta, sin CLI, sin configuracion.

**Con HTTPS garantizado:**
- `crypto.subtle` → SHA-256 funciona, no necesita fallback FNV
- `navigator.clipboard` → funciona sin fallback
- `window.location.origin` → devuelve la URL real (ej: `https://abc123.netlify.app`)
- Base URL → se puede auto-detectar desde `window.location.origin`, no hace falta configurarla manualmente

**Simplificacion del modal config:**
- Campo "Base URL publica" → ya no es necesario. Se auto-detecta de `window.location.origin`
- Solo queda el campo "URL del Apps Script"

**Redirect page (`qr/redirect/index.html`):**
- En Netlify, `/qr/redirect/index.html` es accesible como `/qr/redirect/` o con el path exacto
- Para que `/qr/redirect?code=X` funcione limpio (sin `/index.html`), Netlify lo maneja automaticamente con su configuracion por defecto

#### Action Plan

1. **Modificar `js/app.js`** — En `_initApp()`: `DB._cachedBaseUrl` = `window.location.origin` (sin leer de settings, siempre correcto en HTTPS). Eliminar el campo `config-base-url` del formulario de config.
2. **Modificar `js/auth.js`** — Eliminar fallback FNV-1a. Solo SHA-256. Contexto es HTTPS siempre.
3. **Modificar `index.html`** — Simplificar modal config: solo campo API URL. Eliminar campo Base URL.
4. **Modificar `SETUP.md`** — Reemplazar pasos 8-9 (npx+ngrok) con instrucciones de Netlify Drop (arrastra carpeta → URL permanente). Mantener pasos 1-7 del Sheet.
5. **Crear `netlify.toml`** — Configuracion para que `/qr/redirect?code=X` funcione sin extension (redireccion limpia).

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `js/auth.js` | Modify | Solo SHA-256, eliminar FNV fallback |
| `js/app.js` | Modify | base_url = window.location.origin automatico, limpiar campo config |
| `index.html` | Modify | Modal config: solo campo API URL |
| `SETUP.md` | Modify | Reemplazar npx/ngrok por Netlify Drop |
| `netlify.toml` | Create | Config para routing limpio de /qr/redirect |

#### Acceptance Criteria

- [ ] Subir carpeta a Netlify Drop → app funciona sin ningun paso adicional de servidor
- [ ] URL de redireccion QR usa automaticamente la URL del dominio de Netlify
- [ ] Login con admin/admin funciona (SHA-256 en HTTPS)
- [ ] `/qr/redirect?code=X` redirige correctamente en Netlify
- [ ] Modal config solo pide la URL del Apps Script
- [ ] SETUP.md no menciona npx ni python ni ngrok

#### Estimate

- Complexity: Low
- Files affected: 5

---

### PLANNING #1 — 2026-04-12

#### Objective
Garantizar que toda la app funciona desde `file://` haciendo doble-clic en `index.html`, sin ningun servidor local. Backend 100% Google Sheets. Cuatro problemas especificos a resolver.

#### Analysis

**Problema 1 — Hash inconsistente entre contextos (CRITICO)**

`auth.js` usa SHA-256 cuando `crypto.subtle` esta disponible (HTTP/HTTPS), y FNV-1a cuando no (file://). Si el usuario:
- Hace seed desde HTTP (ngrok) → hash SHA-256 guardado en el Sheet
- Luego abre desde file:// → hash FNV-1a → no coincide → login falla

**Fix:** Eliminar la bifurcacion. Usar **siempre FNV-1a**. La seguridad del hash es irrelevante — el Sheet esta protegido por la cuenta de Google. Consistencia > criptografia aqui.

**Problema 2 — `navigator.clipboard` falla en file://**

`navigator.clipboard.writeText()` requiere contexto seguro (HTTPS o localhost). En file:// lanza error silencioso o rechaza la promise.

**Fix:** Fallback con `document.execCommand('copy')` via un `<textarea>` temporal invisible. Si ambos fallan, mostrar el texto en un campo seleccionable para copiar manual.

**Problema 3 — `window.location.origin` devuelve `"null"` en file://**

En app.js:
```js
DB._cachedBaseUrl = await DB.getSetting('base_url') || window.location.origin;
```
Si `getSetting` devuelve null y `window.location.origin` es `"null"` (string), la URL queda `"null/qr/redirect?code=..."`.

**Fix:** Reemplazar el fallback por cadena vacia + mostrar aviso si base_url no esta configurada.

**Problema 4 — `localStorage` compartido en file://**

En Chrome, todas las paginas `file://` comparten el mismo origin (`null`) y por tanto el mismo `localStorage`. Esto es bueno para nosotros: `qr/redirect/index.html` puede leer `gs_api_url` guardado por `index.html`. Sin cambios necesarios — solo verificar y documentar.

**Problema 5 — SETUP.md y UI mencionan npx/servidor**

Limpiar todas las referencias.

#### Action Plan

1. **Modificar `js/auth.js`** — Eliminar branch `crypto.subtle`. Siempre usar FNV-1a.
2. **Modificar `js/app.js`** — `_copyToClipboard(text)` helper con fallback execCommand. Reemplazar todos los `navigator.clipboard.writeText()`. Fix fallback `window.location.origin`.
3. **Modificar `index.html`** — Ninguno requerido (texto de carga ya es correcto).
4. **Modificar `SETUP.md`** — Eliminar pasos de servidor. Simplificar: doble-clic en index.html.
5. **Nota sobre el Sheet**: Si el usuario ya tiene el hash SHA-256 de `admin` guardado en el Sheet (de una sesion anterior en HTTP), necesita actualizar manualmente la celda C2 de `users` con el hash FNV-1a de `admin`. Documentar esto.

#### Hash FNV-1a de "admin" (para referencia)

El hash que generara el codigo para `admin` es siempre el mismo con FNV-1a. Se calculara automaticamente al hacer seed, pero si hay que actualizar el Sheet manualmente, el valor es generado por:
```js
let h = 0x811c9dc5;
for (let c of 'admin') { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); }
'fnv_' + (h >>> 0).toString(16).padStart(8, '0')
// → 'fnv_e40c292c'
```

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `js/auth.js` | Modify | Siempre FNV-1a, eliminar branch SHA-256 |
| `js/app.js` | Modify | Helper `_copyToClipboard` con fallback, fix origin fallback |
| `SETUP.md` | Modify | Eliminar referencias a servidor, instruccion doble-clic |

#### Acceptance Criteria

- [ ] Doble-clic en `index.html` → modal config → login funciona
- [ ] Hash de password es siempre FNV-1a independientemente del contexto
- [ ] Boton "Copiar URL" funciona en file:// (via execCommand fallback)
- [ ] `DB._cachedBaseUrl` no queda como `"null"` en file://
- [ ] `qr/redirect/index.html` redirige correctamente abierto desde file://
- [ ] SETUP.md sin mencionar npx ni servidor

#### Estimate

- Complexity: Low
- Files affected: 3

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

#### Summary
Simplificacion completa para despliegue en hosting estatico HTTPS. 5 archivos modificados/creados. Sin npx, sin ngrok, sin servidor local. La base URL se auto-detecta de `window.location.origin`.

#### Changes Made

| File | Action | Detail |
|------|--------|--------|
| `js/auth.js` | Modified | Eliminado FNV-1a fallback. Solo SHA-256 via `crypto.subtle`. Contexto HTTPS garantizado en Netlify |
| `js/app.js` | Modified | `DB._cachedBaseUrl = window.location.origin` — auto-deteccion, sin round-trip a getSetting. Eliminado manejo de base_url del config form y de openApiConfig() |
| `index.html` | Modified | Modal config simplificado: eliminado campo "Base URL publica". Solo campo API URL |
| `SETUP.md` | Modified | Reemplazados pasos 8-9 (npx+ngrok) por Netlify Drop. Paso 4 actualizado: hoja settings queda vacia (base URL ya no se configura manualmente) |
| `netlify.toml` | Created | Redirect `/qr/redirect` → `/qr/redirect/index.html` con status 200 para routing limpio |

#### Technical Decisions
- **`window.location.origin` directo**: en HTTPS siempre devuelve el dominio real (ej: `https://abc123.netlify.app`). No hay round-trip a getSetting ni dependencia de la hoja settings
- **netlify.toml status 200**: sirve el HTML sin cambiar la URL del navegador, permitiendo que el JS lea `?code=X` del query string
- **SHA-256 sin fallback**: innecesario ya que HTTPS es el unico contexto de ejecucion. Simplifica el codigo y evita inconsistencias de hash entre sesiones

#### Status
Implementacion completada per PLANNING #2. App lista para Netlify Drop.
