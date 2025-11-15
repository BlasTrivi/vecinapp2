# VecinAPP2

Aplicación demo para gestionar y visualizar promociones de comercios barriales. Los datos se almacenan en `localStorage` del navegador, sin backend.

## Estructura del proyecto
```
index.html         # Documento principal (referencia a CSS y JS externos)
css/styles.css     # Estilos globales y componentes
js/state.js        # Estado global y getters
js/storage.js      # Persistencia localStorage
js/auth.js         # Registro, login, logout y render principal
js/promotions.js   # Lógica de promociones y acciones sobre tarjetas
js/views.js        # Renderizado de vistas usuario y comercio
js/main.js         # Punto de entrada (inicialización y eventos)
js/app.js          # Archivo legacy previo (ya no se carga)
TERMINOS.md        # Texto de términos (demo)
README.md          # Documentación
```

## Flujo básico
1. Registro y Login: pestañas para elegir acción.
	- Registro Vecino: nombre, email (único global), contraseña, términos.
	- Registro Comercio: nombre comercio, rubro, email (único global), contraseña, ubicación, términos.
	- Login: solo email y contraseña (rol detectado automáticamente por el sistema).
2. Sesión: barra superior con saludo y botón "Cerrar sesión".
3. Vecino: filtra y ve promociones, puede canjear (incrementa contador).
4. Comercio: gestiona sus promociones (crear, editar, pausar, activar, eliminar).
5. Cupones: un vecino puede generar UN cupón por promoción (válido 2 horas) con QR y código textual.
6. Comercio: al canjear puede escanear el QR (cámara) o ingresar el código manual; se incrementa `redeemedCount` si el cupón está vigente y disponible.

## Escaneo de cupones (implementado)
Se añadió soporte de escaneo automático desde el panel de comercio.

### Cómo funciona
1. El vecino genera su cupón (botón "Obtener cupón"). Se abre modal con QR y código.
2. El comercio pulsa "Escanear cupón" en su panel.
3. Se abre un modal de cámara (getUserMedia) y se analiza cada frame con `jsQR`.
4. Al detectar un código válido:
   - Se valida vigencia (no vencido, no usado, promo activa, cupos disponibles).
   - Se marca `redeemedAt` y se incrementa `redeemedCount` de la promoción.
   - Se cierra el modal y se rerenderiza la vista.
5. Si el QR no se lee o hay error, puede ingresarse el código manual en el campo del modal.

### Librerías utilizadas
- Generación de QR: `qrcodejs` vía CDN.
- Decodificación: `jsQR` vía CDN.

### Archivo nuevo
- `js/scanner.js`: lógica de cámara, bucle de escaneo y modal. Exporta `openScannerModal()`.

### Eventos
- `open-scanner`: dispara apertura del modal.
- `rerender-app`: re-render general tras canje.

### Consideraciones
- El escaneo continúa mientras no se canjee; códigos rechazados (vencido / ya usado) no detienen la cámara.
- Solo se canjea una vez; se muestran alerts simples (se puede mejorar con UI dedicada).
- Si el usuario revoca permisos de cámara, se muestra mensaje de error.

## Estado y persistencia
- `vecinapp-data-v1`: objeto con `commerces`, `promotions`, `users`.
- Nuevo: `coupons` dentro de `vecinapp-data-v1` con campos `{id, promoId, userId, commerceId, createdAt, expiresAt, redeemedAt, code}`.
- `vecinapp-current-user-id`: id de vecino en sesión.
- `vecinapp-current-commerce-id`: id de comercio en sesión.
 - Restricción: un mismo email NO puede existir simultáneamente como usuario y comercio.

## Pasos para usar
1. Abrir `index.html`.
2. Registrarse eligiendo rol y completando datos.
3. Usar la sesión según rol: filtrar (vecino) o gestionar (comercio).
4. Cerrar sesión si se desea cambiar de rol.

## Mejoras sugeridas futuras
- Inicio de sesión (login) separado del registro.
- Recuperación de contraseña y confirmación email.
- Unificación de eventos y posible migración a framework (React/Vue/Svelte) si escala.
- Tests unitarios por módulo (state, storage, auth, promotions).
- Reemplazar librería QR placeholder por implementación real (ej: `qrcode` / `jsQR`).
- Scanner de QR con cámara (getUserMedia + decodificación) en panel de comercio.
- Evitar redención doble en distintos dispositivos (requiere backend).
- Hash de contraseñas y seguridad (no texto plano).
- Validaciones de formato email y complejidad de contraseña.
- Internacionalización y traducciones.
- Validaciones más estrictas (fechas, valores descuento).
- Paginación o carga diferida si hay muchas promociones.
- Backend real (API REST) y autenticación JWT/OAuth.
- Service Worker para modo offline y PWA.
- Tests unitarios (Jest) + integración.
- Módulos ES (`import/export`).

## Licencia
Proyecto demo sin licencia explícita; adaptar según necesidad.
# vecinapp2
