# TAREA-007 — Auto-crear usuario en primer login

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

Eliminar el sistema de admin/admin. Cambiar el flujo de login:

- Si el usuario NO existe → se crea la cuenta con ese username y password. Primera vez = registro automatico.
- Si el usuario YA existe → se valida con la password que tenga almacenada.

En el formulario de login, indicar al usuario: "Si el usuario no existe, se creara con la contraseña indicada. Si ya existe, se usara la contraseña actual."

Eliminar el seed de admin/admin. Eliminar `pending_seed` del Sheet. La hoja `users` puede empezar completamente vacia.

---

## PLANNING (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned planning iterations -->

### PLANNING #1 — 2026-04-12

#### Objective
Convertir el login en un sistema de auto-registro: si el usuario no existe se crea, si existe se valida. Eliminar admin/admin y el seed.

#### Analysis

**Estado actual:**
- `Code.gs`: `seedUser()` crea admin con hash al arrancar; `login()` solo valida
- `app.js`: `_initApp()` llama `Auth.hashPassword('admin')` + `DB.seedIfNeeded(hash)` cada inicio
- `db.js`: `seedIfNeeded()` y `needsSeed()` para el seed de admin
- `index.html`: texto "Usuario por defecto: admin / admin"
- Google Sheet `users`: fila seed con `admin | pending_seed`

**Solucion:** Modificar la accion `login` en Apps Script para que haga login-or-register:
1. Busca el username
2. Si NO existe → crea el usuario con ese hash → devuelve user (registro automatico)
3. Si existe → compara hash → devuelve user o error

Esto elimina: `seedUser()`, `seed_user` action, `DB.seedIfNeeded()`, `DB.needsSeed()`, el hash de admin en `_initApp()`.

#### Action Plan

1. **`apps-script/Code.gs`** — Modificar `login()`: si user no existe, crearlo con ese hash. Eliminar `seedUser()` y la ruta `seed_user` en doPost.
2. **`js/db.js`** — Eliminar `seedIfNeeded()` y `needsSeed()`.
3. **`js/app.js`** — Eliminar seed de admin en `_initApp()` (las 2 lineas de hashPassword + seedIfNeeded).
4. **`index.html`** — Cambiar texto "Usuario por defecto: admin / admin" por "Si el usuario no existe, se creara con la contraseña indicada."

#### Nuevo flujo login (Code.gs)

```javascript
function login(body) {
  const { username, password_hash } = body;
  if (!username || !password_hash) return err('missing fields');

  const s = sheet('users');
  const rows = sheetData('users');
  const existing = rows.find(r => r.username === username);

  if (!existing) {
    // Auto-register: create user
    const id = nextId('users');
    s.appendRow([id, username, password_hash, now()]);
    return json({ success: true, user: { id, username }, created: true });
  }

  // Validate password
  if (String(existing.password_hash) !== String(password_hash)) {
    return json({ success: false, error: 'invalid credentials' });
  }

  return json({ success: true, user: { id: existing.id, username: existing.username }, created: false });
}
```

#### Files Affected

| File | Action | Description |
|------|--------|-------------|
| `apps-script/Code.gs` | Modify | login() auto-registra, eliminar seedUser() |
| `js/db.js` | Modify | Eliminar seedIfNeeded(), needsSeed() |
| `js/app.js` | Modify | Eliminar seed de admin en _initApp() |
| `index.html` | Modify | Texto informativo en login form |

#### Acceptance Criteria

- [ ] Primera vez con usuario nuevo → se crea la cuenta → entra directo
- [ ] Segunda vez con mismo usuario → valida password → entra o error
- [ ] No hay admin/admin hardcoded en ningun sitio
- [ ] No hay seed al arrancar la app
- [ ] Texto informativo visible en el formulario de login
- [ ] Hoja `users` puede empezar completamente vacia

#### Estimate

- Complexity: Low
- Files affected: 4

---

## EXECUTION (Coder Zone)

<!-- 🤖 CODER-ONLY — Versioned execution reports -->

### EXECUTION #1 — 2026-04-12

Auto-registro en login: usuario no existe → se crea; usuario existe → se valida. Eliminado seed de admin/admin.

| Archivo | Cambio |
|---------|--------|
| `apps-script/Code.gs` | `login()` = login-or-register (crea usuario si no existe), eliminado `seedUser()` y action `seed_user` |
| `js/db.js` | Eliminado `seedIfNeeded()`, `needsSeed()` |
| `js/app.js` | Eliminado seed de admin en `_initApp()` (2 lineas: hashPassword + seedIfNeeded) |
| `index.html` | Texto: "Si el usuario no existe, se creara con la contraseña indicada..." |

Hoja `users` arranca vacia. Primera vez con cualquier usuario = registro automatico.
