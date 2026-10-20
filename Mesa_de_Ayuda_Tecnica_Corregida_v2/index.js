const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Valores permitidos para tickets.
const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS_TICKET = ['abierto', 'en atención', 'cerrado'];
const ESTADOS_TECNICO = ['Disponible', 'Ocupado', 'Inactivo'];

// Almacenamiento en memoria: los datos se pierden al reiniciar el servidor.
let tickets = [];
let tecnicos = [];
let siguienteTicketId = 1;
let siguienteTecnicoId = 1;

// CORS sin dependencias adicionales.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Middlewares para JSON y archivos estáticos.
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function normalizarPrioridad(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

function normalizarEstado(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

function idValido(id) {
  if (typeof id === 'number') return Number.isInteger(id) && id >= 1 ? id : null;
  if (typeof id === 'string' && /^\d+$/.test(id.trim())) {
    const n = Number(id.trim());
    return n >= 1 ? n : null;
  }
  return null;
}

function buscarTicket(id) {
  const idNumerico = idValido(id);
  if (idNumerico === null) return null;
  return tickets.find(ticket => ticket.id === idNumerico) || null;
}

function buscarTecnico(id) {
  const idNumerico = idValido(id);
  if (idNumerico === null) return null;
  return tecnicos.find(tecnico => tecnico.id === idNumerico) || null;
}

function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const f = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(f.getTime()) && f.toISOString().slice(0, 10) === valor;
}

function validarCamposTicket(datos, esEdicion = false) {
  const errores = [];
  const camposTexto = ['titulo', 'descripcion'];

  for (const campo of camposTexto) {
    if (!esEdicion || Object.prototype.hasOwnProperty.call(datos, campo)) {
      if (!textoValido(datos[campo])) errores.push(`El campo "${campo}" es obligatorio y debe ser texto.`);
    }
  }

  if (!esEdicion || Object.prototype.hasOwnProperty.call(datos, 'prioridad')) {
    if (!PRIORIDADES.includes(normalizarPrioridad(datos.prioridad))) {
      errores.push('La prioridad debe ser baja, media o alta.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(datos, 'estado')) {
    if (!ESTADOS_TICKET.includes(normalizarEstado(datos.estado))) {
      errores.push('El estado debe ser abierto, en atención o cerrado.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(datos, 'fecha') &&
      datos.fecha !== null && datos.fecha !== '' && !fechaValida(datos.fecha)) {
    errores.push('La fecha debe tener el formato AAAA-MM-DD y ser una fecha real.');
  }

  if (Object.prototype.hasOwnProperty.call(datos, 'tecnicoId') &&
      datos.tecnicoId !== null && datos.tecnicoId !== '') {
    const tecnico = buscarTecnico(datos.tecnicoId);
    if (!tecnico) errores.push('El técnico indicado no existe.');
  }

  return errores;
}

function aplicarCambiosTicket(ticket, datos) {
  if (Object.prototype.hasOwnProperty.call(datos, 'titulo')) ticket.titulo = datos.titulo.trim();
  if (Object.prototype.hasOwnProperty.call(datos, 'descripcion')) ticket.descripcion = datos.descripcion.trim();
  if (Object.prototype.hasOwnProperty.call(datos, 'prioridad')) ticket.prioridad = normalizarPrioridad(datos.prioridad);
  if (Object.prototype.hasOwnProperty.call(datos, 'estado')) ticket.estado = normalizarEstado(datos.estado);
  if (Object.prototype.hasOwnProperty.call(datos, 'nombreSolicitante')) {
    ticket.nombreSolicitante = textoValido(datos.nombreSolicitante) ? datos.nombreSolicitante.trim() : 'Anónimo';
  }
  if (Object.prototype.hasOwnProperty.call(datos, 'fecha')) ticket.fecha = datos.fecha || null;
  if (Object.prototype.hasOwnProperty.call(datos, 'tecnicoId')) {
    ticket.tecnicoId = datos.tecnicoId === null || datos.tecnicoId === '' ? null : idValido(datos.tecnicoId);
  }
  ticket.actualizadoEn = new Date().toISOString();
}

function responderListaTickets(req, res) {
  const { estado, prioridad } = req.query;
  let resultado = [...tickets];

  if (estado !== undefined) {
    const estadoNormalizado = normalizarEstado(estado);
    if (!ESTADOS_TICKET.includes(estadoNormalizado)) {
      return res.status(400).json({ ok: false, mensaje: 'Filtro estado inválido. Use abierto, en atención o cerrado.' });
    }
    resultado = resultado.filter(ticket => ticket.estado === estadoNormalizado);
  }

  if (prioridad !== undefined) {
    const prioridadNormalizada = normalizarPrioridad(prioridad);
    if (!PRIORIDADES.includes(prioridadNormalizada)) {
      return res.status(400).json({ ok: false, mensaje: 'Filtro prioridad inválido. Use baja, media o alta.' });
    }
    resultado = resultado.filter(ticket => ticket.prioridad === prioridadNormalizada);
  }

  return res.status(200).json({ ok: true, total: resultado.length, tickets: resultado });
}

// RF1 y RF2: crear y listar tickets; admite /tickets y /api/tickets.
app.post(['/api/tickets', '/tickets'], (req, res) => {
  const datos = req.body || {};
  const errores = validarCamposTicket(datos);
  if (errores.length) return res.status(400).json({ ok: false, mensaje: 'Datos inválidos.', errores });

  const ticket = {
    id: siguienteTicketId++,
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    prioridad: normalizarPrioridad(datos.prioridad),
    estado: 'abierto',
    nombreSolicitante: textoValido(datos.nombreSolicitante) ? datos.nombreSolicitante.trim() : 'Anónimo',
    fecha: datos.fecha || null,
    tecnicoId: datos.tecnicoId ? idValido(datos.tecnicoId) : null,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  };

  tickets.push(ticket);
  return res.status(201).json({ ok: true, mensaje: 'Ticket creado correctamente.', ticket });
});

app.get(['/api/tickets', '/tickets'], responderListaTickets);

// RF3: consultar un ticket por ID.
app.get(['/api/tickets/:id', '/tickets/:id'], (req, res) => {
  const ticket = buscarTicket(req.params.id);
  if (!ticket) return res.status(404).json({ ok: false, mensaje: 'No se encontró un ticket con ese ID.' });
  return res.status(200).json({ ok: true, ticket });
});

// RF4 y RF7: editar los campos enviados, validando los valores.
app.put(['/api/tickets/:id', '/tickets/:id'], (req, res) => {
  const ticket = buscarTicket(req.params.id);
  if (!ticket) return res.status(404).json({ ok: false, mensaje: 'No se encontró un ticket con ese ID.' });

  const datos = req.body || {};
  const errores = validarCamposTicket(datos, true);
  if (errores.length) return res.status(400).json({ ok: false, mensaje: 'Datos inválidos.', errores });

  aplicarCambiosTicket(ticket, datos);
  return res.status(200).json({ ok: true, mensaje: 'Ticket actualizado correctamente.', ticket });
});

// RF5: cerrar ticket. La prioridad y demás datos no se modifican.
app.patch(['/api/tickets/:id/cerrar', '/tickets/:id/cerrar'], (req, res) => {
  const ticket = buscarTicket(req.params.id);
  if (!ticket) return res.status(404).json({ ok: false, mensaje: 'No se encontró un ticket con ese ID.' });
  ticket.estado = 'cerrado';
  ticket.actualizadoEn = new Date().toISOString();
  return res.status(200).json({ ok: true, mensaje: 'Ticket cerrado correctamente.', ticket });
});

// RF6: asignar o cambiar técnico. El técnico debe existir.
app.patch(['/api/tickets/:id/asignar', '/tickets/:id/asignar'], (req, res) => {
  const ticket = buscarTicket(req.params.id);
  if (!ticket) return res.status(404).json({ ok: false, mensaje: 'No se encontró un ticket con ese ID.' });

  const { tecnicoId } = req.body || {};
  if (tecnicoId === undefined || tecnicoId === '') {
    return res.status(400).json({ ok: false, mensaje: 'Debe indicar tecnicoId. Use null para quitar la asignación.' });
  }
  if (tecnicoId !== null && !buscarTecnico(tecnicoId)) {
    return res.status(400).json({ ok: false, mensaje: 'El técnico indicado no existe.' });
  }

  ticket.tecnicoId = tecnicoId === null ? null : idValido(tecnicoId);
  ticket.actualizadoEn = new Date().toISOString();
  return res.status(200).json({ ok: true, mensaje: 'Asignación actualizada correctamente.', ticket });
});

// RF9: listar técnicos.
app.get('/api/tecnicos', (req, res) => {
  return res.status(200).json({ ok: true, total: tecnicos.length, tecnicos });
});

// RF9: consultar un técnico.
app.get('/api/tecnicos/:id', (req, res) => {
  const tecnico = buscarTecnico(req.params.id);
  if (!tecnico) return res.status(404).json({ ok: false, mensaje: 'No se encontró un técnico con ese ID.' });
  return res.status(200).json({ ok: true, tecnico });
});

// RF9: crear técnico.
app.post('/api/tecnicos', (req, res) => {
  const { nombre, especialidad, estado } = req.body || {};
  if (!textoValido(nombre) || !textoValido(especialidad) || !textoValido(estado)) {
    return res.status(400).json({ ok: false, mensaje: 'Nombre, especialidad y estado son obligatorios.' });
  }
  if (!ESTADOS_TECNICO.includes(estado.trim())) {
    return res.status(400).json({ ok: false, mensaje: 'El estado del técnico debe ser Disponible, Ocupado o Inactivo.' });
  }

  const tecnico = {
    id: siguienteTecnicoId++,
    nombre: nombre.trim(),
    especialidad: especialidad.trim(),
    estado: estado.trim(),
    creadoEn: new Date().toISOString()
  };
  tecnicos.push(tecnico);
  return res.status(201).json({ ok: true, mensaje: 'Técnico creado correctamente.', tecnico });
});

// RF9: editar técnico.
app.put('/api/tecnicos/:id', (req, res) => {
  const tecnico = buscarTecnico(req.params.id);
  if (!tecnico) return res.status(404).json({ ok: false, mensaje: 'No se encontró un técnico con ese ID.' });

  const { nombre, especialidad, estado } = req.body || {};
  if (!textoValido(nombre) || !textoValido(especialidad) || !textoValido(estado)) {
    return res.status(400).json({ ok: false, mensaje: 'Nombre, especialidad y estado son obligatorios.' });
  }
  if (!ESTADOS_TECNICO.includes(estado.trim())) {
    return res.status(400).json({ ok: false, mensaje: 'El estado del técnico debe ser Disponible, Ocupado o Inactivo.' });
  }

  tecnico.nombre = nombre.trim();
  tecnico.especialidad = especialidad.trim();
  tecnico.estado = estado.trim();
  return res.status(200).json({ ok: true, mensaje: 'Técnico actualizado correctamente.', tecnico });
});

// RF9: eliminar técnico. No permite eliminar uno asignado a tickets.
app.delete('/api/tecnicos/:id', (req, res) => {
  const tecnico = buscarTecnico(req.params.id);
  if (!tecnico) return res.status(404).json({ ok: false, mensaje: 'No se encontró un técnico con ese ID.' });

  if (tickets.some(ticket => ticket.tecnicoId === tecnico.id)) {
    return res.status(400).json({ ok: false, mensaje: 'No se puede eliminar el técnico porque tiene tickets asignados. Reasigne esos tickets primero.' });
  }

  tecnicos = tecnicos.filter(item => item.id !== tecnico.id);
  return res.status(200).json({ ok: true, mensaje: 'Técnico eliminado correctamente.' });
});

// Compatibilidad con el panel existente: citas devuelve una lista vacía,
// ya que el alcance de esta API se centra en tickets.
app.get('/api/tecnicos/:id/citas', (req, res) => {
  const tecnico = buscarTecnico(req.params.id);
  if (!tecnico) return res.status(404).json({ ok: false, mensaje: 'No se encontró un técnico con ese ID.' });
  return res.status(200).json([]);
});

// Toda ruta no encontrada también responde JSON.
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' });
});

// Respuestas de error con formato JSON.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ ok: false, mensaje: 'El cuerpo de la petición contiene JSON inválido.' });
  }
  return res.status(err.status || 500).json({
    ok: false,
    mensaje: err.status === 413 ? 'El cuerpo de la petición es demasiado grande.' : 'Ocurrió un error interno.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de Mesa de Ayuda activa en el puerto ${PORT}`);
});

module.exports = app;
