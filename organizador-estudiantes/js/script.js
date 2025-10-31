/* ========== UTILS & DOM ========== */
const $ = q => document.querySelector(q);
const $$ = q => document.querySelectorAll(q);
const fechaSel = new Date();
let tareas = JSON.parse(localStorage.getItem('tareas')) || [];
let notas = localStorage.getItem('notas') || '';
let nombre = localStorage.getItem('nombre') || '';
$('#notas').value = notas;
$('#nombreUsuario').value = nombre;

/* ========== MODO OSCURO ========== */
const guardaModo = () => localStorage.setItem('dark', document.documentElement.getAttribute('data-theme'));
if (localStorage.getItem('dark') === 'dark') document.documentElement.setAttribute('data-theme','dark');
$('#toggleModo').onclick = () => {
  const esDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', esDark ? 'light' : 'dark');
  guardaModo();
};

/* ========== PERFIL ========== */
$('#nombreUsuario').oninput = e => {
  localStorage.setItem('nombre', e.target.value);
  $('#saludo').textContent = `¡Hola, ${e.target.value || 'Estudiante'}!`;
};
$('#avatar').onclick = () => {
  const url = prompt('URL de tu imagen:');
  if (url) {
    $('#avatar').src = url;
    localStorage.setItem('avatar', url);
  }
};
if (localStorage.getItem('avatar')) $('#avatar').src = localStorage.getItem('avatar');

/* ========== NOTAS RÁPIDAS ========== */
$('#notas').oninput = e => localStorage.setItem('notas', e.target.value);

/* ========== CALENDARIO ========== */
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function pintarCal() {
  const year = fechaSel.getFullYear();
  const mes = fechaSel.getMonth();
  $('#mesTitulo').textContent = `${meses[mes]} ${year}`;
  const primerDia = new Date(year, mes, 1).getDay();
  const diasMes = new Date(year, mes + 1, 0).getDate();
  const hoy = new Date();
  let html = '';
  for (let i = 0; i < primerDia; i++) html += '<div></div>';
  for (let d = 1; d <= diasMes; d++) {
    const esHoy = hoy.getDate() === d && hoy.getMonth() === mes && hoy.getFullYear() === year;
    html += `<div class="${esHoy ? 'hoy' : ''}" data-dia="${d}">${d}</div>`;
  }
  $('#diasCal').innerHTML = html;
  $$('#diasCal div[data-dia]').forEach(el => el.onclick = () => {
    fechaSel.setDate(el.dataset.dia);
    renderTareas();
  });
}
$('#prevMes').onclick = () => { fechaSel.setMonth(fechaSel.getMonth() - 1); pintarCal(); };
$('#nextMes').onclick = () => { fechaSel.setMonth(fechaSel.getMonth() + 1); pintarCal(); };
pintarCal();

/* ========== TAREAS ========== */
$('#formTarea').onsubmit = e => {
  e.preventDefault();
  const t = {
    id: Date.now(),
    titulo: $('#titulo').value.trim(),
    inicio: $('#horaInicio').value,
    fin: $('#horaFin').value,
    categoria: $('#categoria').value,
    prioridad: $('#prioridad').value,
    fecha: fechaSel.toISOString().slice(0,10),
    completada: false
  };
  tareas.push(t);
  guardarTareas();
  renderTareas();
  e.target.reset();
};
function guardarTareas() {
  localStorage.setItem('tareas', JSON.stringify(tareas));
}
function renderTareas() {
  const fecha = fechaSel.toISOString().slice(0,10);
  let lista = tareas.filter(t => t.fecha === fecha);
  const busq = $('#buscador').value.trim().toLowerCase();
  const cat = $('#filtroCateg').value;
  if (busq) lista = lista.filter(t => t.titulo.toLowerCase().includes(busq));
  if (cat) lista = lista.filter(t => t.categoria === cat);
  lista.sort((a,b) => a.inicio.localeCompare(b.inicio));

  $('#listaTareas').innerHTML = lista.map(t => `
    <li class="tarea ${t.completada?'completada':''}" data-id="${t.id}">
      <div>
        <strong>${t.titulo}</strong> (${t.inicio} - ${t.fin})<br>
        <small>${t.categoria} · ${t.prioridad} prioridad</small>
      </div>
      <div>
        <button onclick="toggleTarea(${t.id})">✓</button>
        <button onclick="editarTarea(${t.id})">✎</button>
        <button onclick="borrarTarea(${t.id})">🗑</button>
      </div>
    </li>`).join('');
  actualizarProgreso(lista);
}
window.toggleTarea = id => {
  const t = tareas.find(x => x.id === id);
  t.completada = !t.completada;
  guardarTareas();
  renderTareas();
};
window.borrarTarea = id => {
  if (confirm('¿Borrar tarea?')) {
    tareas = tareas.filter(x => x.id !== id);
    guardarTareas();
    renderTareas();
  }
};
window.editarTarea = id => {
  const t = tareas.find(x => x.id === id);
  $('#titulo').value = t.titulo;
  $('#horaInicio').value = t.inicio;
  $('#horaFin').value = t.fin;
  $('#categoria').value = t.categoria;
  $('#prioridad').value = t.prioridad;
  borrarTarea(id);
};
$('#buscador').oninput = renderTareas;
$('#filtroCateg').onchange = renderTareas;
function actualizarProgreso(lista) {
  const total = lista.length;
  const hechas = lista.filter(t => t.completada).length;
  const porc = total ? Math.round((hechas / total) * 100) : 0;
  $('#barraProgreso').style.width = porc + '%';
  $('#textoProgreso').textContent = `Has completado ${hechas} de ${total} tareas`;
}
renderTareas();

/* ========== POMODORO ========== */
let pomodoroInterval = null;
let tiempoRestante = 25 * 60;
let esEstudio = true;
function fmtT(s) {
  const m = Math.floor(s / 60);
  const seg = s % 60;
  return `${m.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
}
function ticPomodoro() {
  if (tiempoRestante <= 0) {
    clearInterval(pomodoroInterval);
    $('#audioFin').play();
    esEstudio = !esEstudio;
    tiempoRestante = (esEstudio ? $('#minEstudio').value : $('#minDescanso').value) * 60;
    $('#reloj').textContent = fmtT(tiempoRestante);
    notificar(`Fin de ${esEstudio ? 'descanso' : 'estudio'}`);
    return;
  }
  tiempoRestante--;
  $('#reloj').textContent = fmtT(tiempoRestante);
}
$('#btnIniciar').onclick = () => {
  if (pomodoroInterval) return;
  pomodoroInterval = setInterval(ticPomodoro, 1000);
};
$('#btnPausar').onclick = () => { clearInterval(pomodoroInterval); pomodoroInterval = null; };
$('#btnReiniciar').onclick = () => {
  clearInterval(pomodoroInterval);
  pomodoroInterval = null;
  esEstudio = true;
  tiempoRestante = $('#minEstudio').value * 60;
  $('#reloj').textContent = fmtT(tiempoRestante);
};

/* ========== CRONÓMETRO ========== */
let cronoInterval = null;
let cronoSeg = 0;
function ticCrono() {
  cronoSeg++;
  $('#cronometro').textContent = new Date(cronoSeg * 1000).toISOString().substr(11,8);
}
$('#btnCronoIniciar').onclick = () => {
  if (cronoInterval) return;
  cronoInterval = setInterval(ticCrono, 1000);
};
$('#btnCronoReiniciar').onclick = () => {
  clearInterval(cronoInterval);
  cronoInterval = null;
  cronoSeg = 0;
  $('#cronometro').textContent = '00:00:00';
};

/* ========== EXPORTAR ========== */
$('#btnExportar').onclick = () => {
  const fecha = fechaSel.toISOString().slice(0,10);
  const lista = tareas.filter(t => t.fecha === fecha);
  if (!lista.length) return alert('No hay tareas hoy');
  let txt = `Tareas del ${fecha}\n\n`;
  lista.sort((a,b) => a.inicio.localeCompare(b.inicio));
  lista.forEach(t => txt += `• [${t.completada?'X':' '}] ${t.inicio}-${t.fin} ${t.titulo} (${t.categoria})\n`);
  const blob = new Blob([txt], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tareas-${fecha}.txt`;
  a.click();
};

/* ========== NOTIFICACIONES ========== */
function notificar(msg) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(msg);
  } else {
    alert(msg);
  }
}
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

/* ========== ALARMA 10 MIN ========== */
setInterval(() => {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0,10);
  const prox = new Date(ahora.getTime() + 10*60000);
  const proxStr = prox.toTimeString().slice(0,5);
  const lista = tareas.filter(t => t.fecha === fecha && !t.completada && t.inicio === proxStr);
  if (lista.length) notificar(`Tienes "${lista[0].titulo}" en 10 minutos`);
}, 60000);
