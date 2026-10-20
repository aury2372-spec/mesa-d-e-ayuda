# Explicación del código — Mesa de Ayuda Técnica

## 1. Configuración inicial
Se importa Express y `path`, se crea la aplicación y se define el puerto con `process.env.PORT || 3000`. También se declaran las listas permitidas de prioridad y estado, y los arreglos que almacenan tickets y técnicos mientras el servidor está encendido.

**Requisitos:** RNF3, RNF4 y parte de RNF5.

## 2. Middleware CORS
El middleware agrega encabezados para permitir solicitudes desde otros orígenes y admite los métodos HTTP usados por la API. Las solicitudes `OPTIONS` terminan con estado 204, como respuesta previa del navegador.

**Requisitos:** RNF5.

## 3. Middleware JSON y archivos estáticos
`express.json()` convierte cuerpos JSON en `req.body`. `express.static()` publica los archivos de la carpeta `public`, como `index.html`, `admin.html` y `script.js`.

**Requisitos:** RF1, RF9 y RNF1.

## 4. Validaciones y funciones auxiliares
`textoValido` comprueba que un valor sea texto no vacío. Las funciones de búsqueda verifican IDs válidos; `validarCamposTicket` revisa título, descripción, prioridad, estado y existencia del técnico antes de guardar o actualizar.

**Requisitos:** RNF2, RNF3, RNF4 y RF6.

## 5. Crear tickets — `POST /api/tickets` y `POST /tickets`
Recibe título, descripción y prioridad, y puede recibir nombre del solicitante, fecha y técnico. Valida los campos y responde 201 con el ticket creado; si hay errores, responde 400 en JSON.

**Requisitos:** RF1, RF6, RNF1, RNF2 y RNF3.

## 6. Listar y filtrar tickets — `GET /api/tickets` y `GET /tickets`
Devuelve la lista de tickets. Los parámetros `estado` y `prioridad` son opcionales y se pueden combinar; por ejemplo, `GET /tickets?estado=abierto&prioridad=alta`. Los filtros inválidos devuelven 400.

**Requisitos:** RF2, RF8, RNF1, RNF3 y RNF4.

## 7. Consultar ticket por ID — `GET /api/tickets/:id`
Busca el ticket cuyo ID aparece en la URL. Si existe responde 200; si no existe, responde 404 con un mensaje JSON.

**Requisitos:** RF3 y RNF1.

## 8. Editar ticket — `PUT /api/tickets/:id`
Permite cambiar los campos enviados y conserva los demás. Valida los valores modificados y devuelve el ticket actualizado o un error JSON.

**Requisitos:** RF4, RF7, RNF1, RNF2, RNF3 y RNF4.

## 9. Cerrar ticket — `PATCH /api/tickets/:id/cerrar`
Busca el ticket y establece explícitamente `estado: "cerrado"`. Si el ID no existe, responde 404; si lo encuentra, devuelve 200.

**Requisitos:** RF5, RF7 y RNF4.

## 10. Asignar técnico — `PATCH /api/tickets/:id/asignar`
Recibe `tecnicoId`, verifica que el técnico exista y después asigna su ID al ticket. Para retirar una asignación se puede enviar `{"tecnicoId": null}`.

**Requisitos:** RF6, RF7 y RNF2.

## 11. CRUD de técnicos
`GET /api/tecnicos` lista; `GET /api/tecnicos/:id` consulta uno; `POST /api/tecnicos` crea; `PUT /api/tecnicos/:id` edita y `DELETE /api/tecnicos/:id` elimina. No se permite eliminar un técnico mientras tenga tickets asignados, para evitar referencias rotas.

**Requisitos:** RF9 y RNF2.

## 12. Compatibilidad con citas
La ruta `GET /api/tecnicos/:id/citas` devuelve una lista vacía si el técnico existe. Se conserva para que el panel anterior no falle, pero esta versión no implementa un sistema de citas porque los requisitos solicitados se centran en tickets.

**Requisitos:** Compatibilidad con la estructura anterior; no cubre un requisito RF específico.

## 13. Manejo de errores y rutas inexistentes
El manejador de errores transforma errores de JSON mal formado en respuestas 400 JSON. La ruta final responde 404 JSON para URLs no definidas.

**Requisitos:** RNF1 y RNF2.

## 14. Arranque del servidor
`app.listen(PORT, '0.0.0.0', ...)` inicia el servidor en el puerto asignado por el entorno o en el 3000. Esto permite que Render asigne el puerto y que el servidor escuche en las interfaces de red disponibles.

**Requisitos:** RNF5.

## 15. Interfaz web
`public/index.html` contiene el formulario de tickets y los filtros. `public/script.js` envía JSON a la API, carga técnicos y tickets, y permite cerrar tickets. `public/admin.html` permite crear, editar y eliminar técnicos desde el navegador.

**Requisitos:** RF1, RF2, RF5, RF8 y RF9.

## Tabla final: Requisito → Dónde se cumple en el código

| Requisito | Dónde se cumple |
|---|---|
| RF1 Crear ticket | `POST /api/tickets`, formulario en `public/index.html` |
| RF2 Listar tickets | `GET /api/tickets` |
| RF3 Consultar ticket por ID | `GET /api/tickets/:id` |
| RF4 Editar ticket | `PUT /api/tickets/:id` |
| RF5 Cerrar ticket | `PATCH /api/tickets/:id/cerrar` |
| RF6 Asignar técnico existente | `PATCH /api/tickets/:id/asignar`; validación en `validarCamposTicket` |
| RF7 Cambiar prioridad y estado | `PUT /api/tickets/:id` |
| RF8 Filtrar por estado o prioridad | `GET /api/tickets?estado=...&prioridad=...` |
| RF9 Crear, listar, editar y eliminar técnicos | Rutas `/api/tecnicos` y `/api/tecnicos/:id` |
| RNF1 JSON en la API | Respuestas de rutas, middleware de errores y ruta 404 |
| RNF2 Validar obligatorios | `validarCamposTicket` y validaciones en rutas de técnicos |
| RNF3 Prioridades permitidas | `PRIORIDADES` y validaciones de ticket/filtros |
| RNF4 Estados permitidos | `ESTADOS_TICKET` y validaciones de ticket/filtros |
| RNF5 Acceso y despliegue | CORS, `process.env.PORT`, escucha en `0.0.0.0` |

## Nota para la sustentación
Los datos se guardan en arreglos de memoria. Por eso, al reiniciar la aplicación se borran. Para conservarlos entre despliegues o reinicios se debe conectar una base de datos, por ejemplo PostgreSQL. CORS permite solicitudes entre orígenes, pero la accesibilidad real también depende de que el servidor esté publicado y la red permita acceder a él.
