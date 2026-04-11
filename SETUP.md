# QR Manager — Guia de configuracion

## Requisitos

- Cuenta de Google
- Navegador moderno (Chrome, Firefox, Safari, Edge)

---

## Paso 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com)
2. Crea una hoja en blanco → renombrala **QR Manager DB**

---

## Paso 2 — Crear hoja `users`

Renombra la primera pestana a `users`. Encabezados en fila 1:

| A | B | C | D |
|---|---|---|---|
| id | username | password_hash | created_at |

Fila 2 (usuario seed):

| A | B | C | D |
|---|---|---|---|
| 1 | admin | pending_seed | 2026-04-12 |

> La app reemplazara `pending_seed` con el hash real al primer arranque.

---

## Paso 3 — Crear hoja `qr_codes`

Nueva pestana → renombrar a `qr_codes`. Encabezados en fila 1:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | user_id | name | target_url | short_code | created_at | updated_at |

Dejar vacia.

---

## Paso 4 — Crear hoja `settings`

Nueva pestana → renombrar a `settings`. Encabezados en fila 1:

| A | B |
|---|---|
| key | value |

Dejar vacia (la base URL se detecta automaticamente del dominio).

---

## Paso 5 — Crear el Apps Script

1. En el Sheet: menu **Extensiones → Apps Script**
2. Borra el contenido de `Code.gs`
3. Abre el archivo `apps-script/Code.gs` de este proyecto y copia todo su contenido
4. Pegalo en el editor de Apps Script
5. Guarda (Ctrl+S)

---

## Paso 6 — Desplegar el Apps Script

1. Click en **Implementar → Nueva implementacion**
2. Tipo: **App web**
3. Descripcion: `QR Manager API v1`
4. Ejecutar como: **Yo** (tu cuenta de Google)
5. Quien tiene acceso: **Cualquier persona**
6. Click **Implementar**
7. **Copia la URL** que aparece (empieza con `https://script.google.com/macros/s/...`)

> Guarda bien esa URL — la necesitas en el paso siguiente.

---

## Paso 7 — Autorizar permisos

La primera vez, Google pedira autorizacion:

1. Click "Revisar permisos"
2. Selecciona tu cuenta de Google
3. Click "Avanzado" (abajo izquierda)
4. Click "Ir a QR Manager DB (no seguro)"
5. Click "Permitir"

---

## Paso 8 — Publicar la app en Netlify

1. Ve a [netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta del proyecto (`coder-agent-test`) al area de drop
3. En segundos obtienes una URL HTTPS permanente (ej: `https://abc123.netlify.app`)

> Sin cuenta, sin CLI, sin configuracion adicional.

---

## Paso 9 — Configurar la app

1. Abre la URL de Netlify en el navegador
2. Aparece el modal de configuracion automaticamente
3. Pega la URL del Apps Script en el campo **URL del Apps Script**
4. Click **Guardar y conectar**
5. Login con **admin / admin**

> La URL publica de redireccion QR se detecta automaticamente del dominio de Netlify.

---

## Estructura del Sheet

```
QR Manager DB
├── users         → id | username | password_hash | created_at
├── qr_codes      → id | user_id | name | target_url | short_code | created_at | updated_at
└── settings      → key | value
```

## Endpoints del Apps Script

| Metodo | action | Descripcion |
|--------|--------|-------------|
| GET | redirect | Busca short_code y retorna target_url |
| GET | get_setting | Lee un valor de settings |
| POST | seed_user | Crea usuario admin si no existe |
| POST | login | Valida usuario/password |
| POST | list_qr | Lista QR codes del usuario |
| POST | get_qr | Obtiene QR por id |
| POST | get_qr_by_code | Obtiene QR por short_code |
| POST | create_qr | Crea nuevo QR |
| POST | update_qr | Actualiza QR |
| POST | delete_qr | Elimina QR |
| POST | get_setting | Lee setting |
| POST | set_setting | Escribe setting |
