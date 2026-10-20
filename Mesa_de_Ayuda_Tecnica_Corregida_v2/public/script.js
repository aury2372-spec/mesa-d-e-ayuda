const formulario = document.getElementById('formulario');
const listaTickets = document.getElementById('listaTickets');
const selectTecnico = document.getElementById('tecnico');
const mensajeFormulario = document.getElementById('mensajeFormulario');

async function pedirJSON(url, opciones = {}) {
  const respuesta = await fetch(url, opciones);
  let datos;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('El servidor no respondió con JSON válido. Verifique que la API esté activa.');
  }
  if (!respuesta.ok) throw new Error(datos.mensaje || 'La solicitud no se pudo completar.');
  return datos;
}

async function cargarTecnicosEnSelect() {
  try {
    const datos = await pedirJSON('/api/tecnicos');
    selectTecnico.innerHTML = '<option value="">Sin asignar</option>';
    datos.tecnicos.forEach(tecnico => {
      const opcion = document.createElement('option');
      opcion.value = tecnico.id;
      opcion.textContent = `${tecnico.nombre} — ${tecnico.especialidad}`;
      selectTecnico.appendChild(opcion);
    });
  } catch (error) {
    selectTecnico.innerHTML = '<option value="">No se pudieron cargar técnicos</option>';
  }
}

function crearParrafo(etiqueta, valor) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${etiqueta}: `;
  p.append(strong, document.createTextNode(valor ?? 'No especificado'));
  return p;
}

async function cargarTickets() {
  const estado = document.getElementById('filtroEstado').value;
  const prioridad = document.getElementById('filtroPrioridad').value;
  const parametros = new URLSearchParams();
  if (estado) parametros.set('estado', estado);
  if (prioridad) parametros.set('prioridad', prioridad);

  listaTickets.textContent = 'Cargando tickets...';
  try {
    const datos = await pedirJSON(`/api/tickets${parametros.toString() ? `?${parametros}` : ''}`);
    listaTickets.innerHTML = '';
    if (datos.tickets.length === 0) {
      listaTickets.textContent = 'No hay tickets que coincidan con los filtros.';
      return;
    }

    datos.tickets.forEach(ticket => {
      const tarjeta = document.createElement('article');
      tarjeta.className = 'ticket';
      const titulo = document.createElement('h3');
      titulo.textContent = `#${ticket.id} — ${ticket.titulo}`;
      tarjeta.appendChild(titulo);
      tarjeta.append(
        crearParrafo('Solicitante', ticket.nombreSolicitante),
        crearParrafo('Descripción', ticket.descripcion),
        crearParrafo('Prioridad', ticket.prioridad),
        crearParrafo('Estado', ticket.estado),
        crearParrafo('Técnico ID', ticket.tecnicoId ?? 'Sin asignar'),
        crearParrafo('Fecha solicitada', ticket.fecha || 'No indicada')
      );

      if (ticket.estado !== 'cerrado') {
        const cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.textContent = 'Cerrar ticket';
        cerrar.addEventListener('click', async () => {
          try {
            await pedirJSON(`/api/tickets/${ticket.id}/cerrar`, { method: 'PATCH' });
            await cargarTickets();
          } catch (error) {
            alert(error.message);
          }
        });
        tarjeta.appendChild(cerrar);
      }
      listaTickets.appendChild(tarjeta);
    });
  } catch (error) {
    listaTickets.textContent = `Error: ${error.message}`;
  }
}

formulario.addEventListener('submit', async event => {
  event.preventDefault();
  mensajeFormulario.textContent = '';
  mensajeFormulario.className = '';
  const body = {
    nombreSolicitante: document.getElementById('nombre').value.trim(),
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    prioridad: document.getElementById('prioridad').value,
    fecha: document.getElementById('fecha').value || null,
    tecnicoId: selectTecnico.value || null
  };

  if (body.tecnicoId !== null) body.tecnicoId = Number(body.tecnicoId);

  try {
    const datos = await pedirJSON('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    mensajeFormulario.textContent = `Ticket #${datos.ticket.id} creado correctamente.`;
    formulario.reset();
    await cargarTickets();
  } catch (error) {
    mensajeFormulario.textContent = `Error: ${error.message}`;
    mensajeFormulario.className = 'error';
  }
});

document.getElementById('btnFiltrar').addEventListener('click', cargarTickets);
document.getElementById('btnLimpiar').addEventListener('click', () => {
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroPrioridad').value = '';
  cargarTickets();
});

cargarTecnicosEnSelect();
cargarTickets();
