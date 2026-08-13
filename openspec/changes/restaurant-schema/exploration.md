## Exploration: Diseño del Esquema de Base de Datos para Restaurante/TPV

### Current State
El sistema actualmente cuenta con una conexión base de PostgreSQL usando SQLAlchemy (`database.py`) y un endpoint básico de salud (`/db-check`). No hay tablas creadas todavía.

### Affected Areas
- `backend/models.py` (nuevo) — Contendrá las definiciones de SQLAlchemy para todas las tablas.
- `backend/schemas.py` (nuevo) — Contendrá los esquemas de Pydantic para validación y serialización de datos.

### Propuesta de Entidades y Tablas (Esquema SQL)

1. **`users` (Usuarios / Empleados)**
   - Gestiona quién hace qué. Permite diferenciar entre un "camarero" (hace pedidos) y un "admin/ordenador central" (crea productos).
   - *Campos*: id, username, password_hash, role (ENUM: admin, waiter, kitchen), is_active.

2. **`categories` (Categorías)**
   - Para agrupar los productos (Ej: Bebidas, Postres, Principales).
   - *Campos*: id, name, description.

3. **`products` (Productos)**
   - El catálogo de venta.
   - *Campos Base*: id, name, price (Numeric/Decimal para euros), image_url (foto), category_id.
   - *Sugerencias extra*:
     - `is_active` (Boolean): En lugar de borrar productos que ya no vendes (lo cual rompería el histórico de pedidos), simplemente los desactivas.
     - `description` (Text): Detalles del plato.
     - `allergens` (String): Información crucial en hostelería (ej. "Gluten, Lácteos").
     - `stock` (Integer): Opcional. Útil si vendes productos limitados (ej. cervezas embotelladas).

4. **`orders` (Pedidos - Cabecera)**
   - Representa el ticket o pedido global de una mesa.
   - *Campos*: id, table_number (número de mesa), waiter_id (quién lo pidió), status (ENUM: pending, preparing, ready, delivered, paid), total_amount, created_at, updated_at.
   - *Sugerencias extra*: `notes` (notas globales como "mesa con prisa").

5. **`order_items` (Líneas de Pedido)**
   - Relaciona los productos individuales con un pedido.
   - *Campos*: id, order_id, product_id, quantity, unit_price (copiado del producto en ese momento, por si el precio cambia en el futuro), notes (ej. "sin cebolla").

### Enfoque para Realtime (Tiempo Real)
Para lograr que los pedidos lleguen en realtime al "ordenador central" o "cocina":
1. **WebSockets con FastAPI**: Es la aproximación nativa y más ligera. El ordenador central (frontend) se conecta por WS al backend. Cuando el camarero crea un pedido por HTTP POST, el backend emite un mensaje por WebSocket a todos los clientes conectados notificando el nuevo pedido.
2. **Server-Sent Events (SSE)**: Más sencillo si la comunicación es solo unidireccional (Backend -> Ordenador central).

### Recommendation
**Aproximación recomendada**: Usar WebSockets integrados en FastAPI + SQL Relacional.
- Crear los modelos SQLAlchemy descritos (`users`, `categories`, `products`, `orders`, `order_items`).
- Usar un `EventManager` en FastAPI para mantener las conexiones de WebSocket abiertas de las pantallas centrales.

### Risks
- **Gestión del estado de WebSockets**: Si hay múltiples instancias del backend en el futuro, las conexiones WebSocket requerirían un Redis Pub/Sub, pero para un solo servidor (local/restaurante), FastAPI en memoria es suficiente.
- **Precisión de moneda**: Usar siempre tipos `DECIMAL` o `NUMERIC` en PostgreSQL para los precios, nunca `FLOAT` (para evitar errores de redondeo con el euro).

### Ready for Proposal
Sí. La arquitectura de datos está clara y lista para pasar a la fase de diseño técnico e implementación de los modelos (ORM).
