# VecinAPP2

Demo para gestionar y visualizar promociones de comercios barriales. Ahora todos los datos se almacenan en una base PostgreSQL accesible mediante una API Node/Express, evitando el uso de `localStorage` en el navegador.

## Arquitectura
- **Frontend estático** (`index.html` + `css/` + `js/`): UI en vanilla JS con módulos ES.
- **Backend ligero** (`server/`): Express + PostgreSQL (vía `pg`) que expone `/api/state` y sirve los archivos estáticos.

## Estructura
```
index.html         # Shell principal
css/styles.css     # Estilos globales
js/state.js        # Estado global y utilidades
js/storage.js      # Capa de persistencia (fetch a la API)
js/auth.js         # Registro/login y enrutado simple
js/promotions.js   # Lógica de promociones y formularios
js/views.js        # Vistas de usuario/comercio/perfiles
js/main.js         # Punto de entrada ES Modules
js/scanner.js      # Scanner QR para canjes
server/            # API Express + PostgreSQL
   package.json
   server.js
   db.js
   .gitignore       # Ignora archivos sensibles (ej. .env)
TERMINOS.md        # Texto de términos (demo)
README.md          # Este archivo
```

## Cómo ejecutar
1. Configurar la base de datos (local o en la nube). Ejemplo local:
   ```bash
   createdb vecinapp
   # opcional: crear usuario y asignar permisos
   ```
   Definí `DATABASE_URL` (puede ir en `server/.env`, ver `server/.env.example`) si no usás la cadena por defecto (`postgres://postgres:postgres@localhost:5432/vecinapp`).
2. Instalar dependencias del backend:
   ```bash
   cd server
   npm install
   ```
3. Iniciar el servidor (sirve API y frontend en `http://localhost:4173`):
   ```bash
   npm start
   ```
4. Abrir el navegador en `http://localhost:4173` y usar la app normalmente. Todos los cambios (usuarios, comercios, promociones y canjes) se guardan en la base PostgreSQL configurada.

> Nota: si querés apuntar a otro dominio/API, definí `window.VECINAPP_API_BASE` antes de cargar `js/main.js`.

## Flujo principal
1. Registro/Login: un mismo email no puede repetirse entre vecinos y comercios.
2. Sesión: barra superior con acceso a perfil, estadísticas (comercio) y logout.
3. Vecino: explora promos, filtra por categoría/barrio/radio y ve códigos de canje.
4. Comercio: crea/edita/pausa promociones, canjea códigos y ve métricas básicas.
5. Scanner: cámara integrada con `js/scanner.js` + `jsQR` para validar códigos.

## Estado y persistencia
- `js/storage.js` consulta `GET /api/state` al iniciar.
- Cada modificación llama a `saveData()` que sincroniza el snapshot completo mediante `POST /api/state`. El backend reemplaza el contenido de las tablas dentro de una transacción PostgreSQL.
- No se guarda ningún dato en `localStorage` o `sessionStorage`; al recargar habrá que iniciar sesión de nuevo.

## Despliegue en Render (PostgreSQL gestionado)
1. Crear un servicio Web en Render apuntando a la raíz del repo.
2. Crear una base PostgreSQL en Render y copiar la `DATABASE_URL` (debería terminar con `?sslmode=require`).
3. Variables de entorno mínimas:
   - `DATABASE_URL`: cadena completa provista por Render.
4. Comandos recomendados:
   - **Build**: `npm install --prefix server`
   - **Start**: `npm start --prefix server`
5. El frontend queda servido por el mismo servicio, por lo que no necesitás configurar CORS adicionales.

## Posibles mejoras
- Endpoints granulares por entidad en lugar de sincronizar el snapshot completo.
- Autenticación real (tokens/JWT) + hash de contraseñas.
- Validaciones de negocio en la API y control de concurrencia.
- Tests unitarios e2e.
- Despliegue con Docker o plataformas serverless + base gestionada.

## Licencia
Proyecto demo sin licencia explícita; adaptar antes de usar en producción.
