/**
 * CALCULADORA DE COSTOS LABORALES COLOMBIA 2026
 * Basada en legislación vigente — SMMLV 2026: $1.750.905
 */

'use strict';

// ============================================================
//  CONFIGURACION 2026 (CARGADA DE config.js)
// ============================================================
const CONFIG_2026 = typeof CONFIG_APP !== 'undefined' ? CONFIG_APP : {}; // Backward compatibility

// ============================================================
//  CALCULATION ENGINE
// ============================================================
function calcularCostoTotal(salarioBase, nivelARL = 1, incluirSalud = false, incluyeAuxilio = true) {
  const ganaHastaDosSmmlv = salarioBase <= CONFIG_2026.LIMIT_AUX_TRANSP;
  // Es opcional siempre que gane menos de 2 SMMLV
  const tieneAuxilio = ganaHastaDosSmmlv && incluyeAuxilio;
  const auxilioTransp = tieneAuxilio ? CONFIG_2026.AUX_TRANSPORTE : 0;

  const baseIBC = salarioBase;

  // Seguridad Social
  const valorPension = baseIBC * CONFIG_2026.PENSION;
  const valorARL = baseIBC * CONFIG_2026.ARL[nivelARL];
  const valorSalud = incluirSalud ? baseIBC * CONFIG_2026.SALUD : 0;

  // Para la UI (saber si está exonerado de salud o no)
  const exoSS = !incluirSalud;

  // Prestaciones  (base = salario + auxilio transporte)
  const basePrestaciones = salarioBase + auxilioTransp;
  const valorPrima = basePrestaciones * CONFIG_2026.PRIMA;
  const valorCesantias = basePrestaciones * CONFIG_2026.CESANTIAS;
  const valorIntCesantias = basePrestaciones * (0.01 / 12); // Ajuste: (Base * 0.01 / 12)
  const valorVacaciones = salarioBase * CONFIG_2026.VACACIONES;

  // Parafiscales
  const exoneracionGeneral = salarioBase < CONFIG_2026.EXONERACION_LIMIT;
  const valorCaja = baseIBC * CONFIG_2026.CAJA;
  const valorSena = exoSS || exoneracionGeneral ? 0 : baseIBC * CONFIG_2026.SENA;
  const valorICBF = exoSS || exoneracionGeneral ? 0 : baseIBC * CONFIG_2026.ICBF;

  const granTotal =
    salarioBase + auxilioTransp +
    valorPension + valorSalud + valorARL +
    valorPrima + valorCesantias + valorIntCesantias + valorVacaciones +
    valorCaja + valorSena + valorICBF;

  return {
    salario: salarioBase,
    auxTransporte: auxilioTransp,
    tieneAuxilio,
    exoSS,

    // Seguridad Social
    valorPension,
    valorSalud,
    valorARL,
    totalSS: valorPension + valorSalud + valorARL,

    // Prestaciones
    valorPrima,
    valorCesantias,
    valorIntCesantias,
    valorVacaciones,
    totalPrestaciones: valorPrima + valorCesantias + valorIntCesantias + valorVacaciones,

    // Parafiscales
    valorCaja,
    valorSena,
    valorICBF,
    totalParafiscales: valorCaja + valorSena + valorICBF,

    totalCosto: granTotal,
    porcentajeAdicional: ((granTotal / salarioBase) - 1) * 100
  };
}

// ============================================================
//  FORMATTING
// ============================================================
const fmtCOP = (n) =>
  '$' + Math.round(n).toLocaleString('es-CO');

const fmtPct = (n) => n.toFixed(2) + '%';

function stripFormatting(str) {
  return parseInt(str.replace(/\D/g, ''), 10) || 0;
}

// ============================================================
//  STATE
// ============================================================
const state = {
  salario: CONFIG_2026.SMMLV,
  nivelARL: 1,
  incluirSalud: false,
  incluyeAuxilio: true,
  periodoAnual: false,
  resultado: null
};

// ============================================================
//  DOM REFS
// ============================================================
const $ = (id) => document.getElementById(id);

const el = {
  salarioInput: $('salarioBase'),
  salarioSlider: $('salarioSlider'),
  sliderLabel: $('sliderLabel'),
  arlGrid: $('arlGrid'),
  toggleSaludCard: $('toggleSalud'),
  toggleSaludSwitch: $('toggleSwitchSalud'),
  toggleSaludThumb: $('toggleThumbSalud'),
  toggleSaludState: $('toggleStateSalud'),
  toggleAuxCard: $('toggleAuxilio'),
  toggleAuxSwitch: $('toggleSwitchAux'),
  toggleAuxThumb: $('toggleThumbAux'),
  toggleAuxState: $('toggleStateAux'),
  heroTotal: $('heroTotal'),
  heroPercent: $('heroPercent'),
  heroAnnual: $('heroAnnual'),
  scardSalary: $('scardSalary'), scardSalaryPct: $('scardSalaryPct'),
  scardSS: $('scardSS'), scardSSPct: $('scardSSPct'),
  scardPrest: $('scardPrest'), scardPrestPct: $('scardPrestPct'),
  scardPara: $('scardPara'), scardParaPct: $('scardParaPct'),
  costBars: $('costBars'),
  detailTable: $('detailTable'),
  donutSvg: $('donutSvg'),
  donutLegend: $('donutLegend'),
  btnMonthly: $('btnMonthly'),
  btnAnnual: $('btnAnnual'),
  tooltipPopup: $('tooltipPopup'),
};

// ============================================================
//  CHART COLORS
// ============================================================
const COLORS = {
  salary: '#6366F1',
  ss: '#06B6D4',
  prest: '#10B981',
  para: '#F59E0B',
  pension: '#818CF8',
  salud: '#38BDF8',
  arl: '#7DD3FC',
  prima: '#34D399',
  ces: '#6EE7B7',
  intCes: '#A7F3D0',
  vac: '#BBF7D0',
  caja: '#FCD34D',
  sena: '#FDE68A',
  icbf: '#FEF08A',
};

// ============================================================
//  RENDER
// ============================================================
function render() {
  const r = state.resultado;
  const mult = state.periodoAnual ? 12 : 1;

  const total = r.totalCosto * mult;
  const salPlusAux = (r.salario + r.auxTransporte) * mult;
  const ss = r.totalSS * mult;
  const prest = r.totalPrestaciones * mult;
  const para = r.totalParafiscales * mult;

  // Hero
  animateValue(el.heroTotal, fmtCOP(total));
  el.heroPercent.textContent = '+' + r.porcentajeAdicional.toFixed(1) + '%';
  el.heroAnnual.textContent = fmtCOP(r.totalCosto * 12) + ' / año';

  // Summary cards
  const renderCard = (val, pctEl, valEl, pct) => {
    valEl.textContent = fmtCOP(val);
    pctEl.textContent = pct.toFixed(1) + '%';
  };

  renderCard(salPlusAux, el.scardSalaryPct, el.scardSalary, (salPlusAux / total) * 100);
  renderCard(ss, el.scardSSPct, el.scardSS, (ss / total) * 100);
  renderCard(prest, el.scardPrestPct, el.scardPrest, (prest / total) * 100);
  renderCard(para, el.scardParaPct, el.scardPara, (para / total) * 100);

  // Cost bars
  renderBars(r, mult, total);

  // Detail table
  renderDetailTable(r, mult);

  // Donut
  renderDonut([
    { label: 'Salario + Auxilio', value: salPlusAux, color: COLORS.salary },
    { label: 'Seg. Social', value: ss, color: COLORS.ss },
    { label: 'Prestaciones', value: prest, color: COLORS.prest },
    { label: 'Parafiscales', value: para, color: COLORS.para },
  ], total);
}

// ----  BARS  ----
function renderBars(r, mult, total) {
  const bars = [
    { label: 'Salario base', value: r.salario * mult, color: COLORS.salary },
    { label: 'Aux. Transporte', value: r.auxTransporte * mult, color: '#A78BFA' },
    { label: 'Pensión', value: r.valorPension * mult, color: COLORS.pension },
    { label: 'Salud', value: r.valorSalud * mult, color: COLORS.salud },
    { label: 'ARL', value: r.valorARL * mult, color: COLORS.arl },
    { label: 'Prima Servicio', value: r.valorPrima * mult, color: COLORS.prima },
    { label: 'Cesantías', value: r.valorCesantias * mult, color: COLORS.ces },
    { label: 'Int. Cesantías', value: r.valorIntCesantias * mult, color: COLORS.intCes },
    { label: 'Vacaciones', value: r.valorVacaciones * mult, color: COLORS.vac },
    { label: 'Caja Compensación', value: r.valorCaja * mult, color: COLORS.caja },
    { label: 'SENA', value: r.valorSena * mult, color: COLORS.sena },
    { label: 'ICBF', value: r.valorICBF * mult, color: COLORS.icbf },
  ];

  el.costBars.innerHTML = bars.map(b => {
    const pct = (b.value / total * 100).toFixed(1);
    const widthPct = Math.max((b.value / total * 100), 0);
    const isZero = b.value === 0;
    return `
      <div class="bar-item">
        <span class="bar-label">${b.label}</span>
        <div class="bar-track">
          <div class="bar-fill"
               style="width:${widthPct}%; background:${b.color}; opacity:${isZero ? 0.2 : 1}">
          </div>
        </div>
        <span class="bar-amount" style="color:${isZero ? 'var(--text-3)' : 'var(--text-1)'}">
          ${isZero ? r.exoSS ? '(Exonerado)' : '$0' : fmtCOP(b.value)}
          <small style="color:var(--text-3); font-weight:400"> ${pct}%</small>
        </span>
      </div>`;
  }).join('');
}

// ----  DETAIL TABLE  ----
function renderDetailTable(r, mult) {
  const groups = [
    {
      name: 'Salario y Auxilio Transporte',
      color: COLORS.salary,
      total: (r.salario + r.auxTransporte) * mult,
      items: [
        { name: 'Salario base mensual', rate: null, val: r.salario * mult },
        {
          name: `Auxilio de transporte${!r.tieneAuxilio ? ' (No aplica)' : ''}`,
          rate: null,
          val: r.auxTransporte * mult,
          exo: !r.tieneAuxilio
        }
      ]
    },
    {
      name: 'Seguridad Social (Empresa)',
      color: COLORS.ss,
      total: r.totalSS * mult,
      items: [
        { name: 'Pensión', rate: '12.00%', val: r.valorPension * mult },
        { name: 'Salud Obligatoria', rate: '8.50%', val: r.valorSalud * mult, exoLabel: r.exoSS ? 'Exonerado' : null },
        { name: 'ARL', rate: fmtPct(CONFIG_2026.ARL[state.nivelARL] * 100), val: r.valorARL * mult }
      ]
    },
    {
      name: 'Prestaciones Sociales',
      color: COLORS.prest,
      total: r.totalPrestaciones * mult,
      items: [
        { name: 'Prima de Servicios', rate: '8.33%', val: r.valorPrima * mult },
        { name: 'Cesantías', rate: '8.33%', val: r.valorCesantias * mult },
        { name: 'Intereses Cesantías', rate: '0.0833%', val: r.valorIntCesantias * mult },
        { name: 'Vacaciones', rate: '4.17%', val: r.valorVacaciones * mult }
      ]
    },
    {
      name: 'Parafiscales',
      color: COLORS.para,
      total: r.totalParafiscales * mult,
      items: [
        { name: 'Caja de Compensación', rate: '4.00%', val: r.valorCaja * mult },
        { name: 'SENA', rate: '2.00%', val: r.valorSena * mult, exoLabel: r.exoSS ? 'Exonerado' : null },
        { name: 'ICBF', rate: '3.00%', val: r.valorICBF * mult, exoLabel: r.exoSS ? 'Exonerado' : null }
      ]
    }
  ];

  el.detailTable.innerHTML = groups.map((g, gi) => `
    <div class="detail-group">
      <div class="detail-group-header" onclick="toggleGroup(${gi})">
        <div class="detail-group-name">
          <div class="detail-group-dot" style="background:${g.color}; box-shadow:0 0 6px ${g.color}88"></div>
          ${g.name}
        </div>
        <span class="detail-group-total">${fmtCOP(g.total)}</span>
      </div>
      <div class="detail-group-body" id="grp-body-${gi}" style="max-height:300px">
        ${g.items.map(item => `
          <div class="detail-row">
            <span class="detail-row-name">${item.name}</span>
            ${item.rate ? `<span class="detail-row-rate">${item.rate}</span>` : ''}
            <span class="detail-row-val ${item.exo ? 'zero' : ''} ${item.exoLabel ? 'exo' : ''}">
              ${item.exoLabel ? item.exoLabel : (item.exo ? '—' : fmtCOP(item.val))}
            </span>
          </div>`).join('')}
      </div>
    </div>
  `).join('');
}

const groupOpen = [true, true, true, true];

function toggleGroup(idx) {
  groupOpen[idx] = !groupOpen[idx];
  const body = document.getElementById(`grp-body-${idx}`);
  if (body) {
    body.style.maxHeight = groupOpen[idx] ? '300px' : '0';
  }
}

// ----  DONUT  ----
function renderDonut(segments, total) {
  const R = 80;
  const C = 2 * Math.PI * R; // circumference ≈ 502.65

  let offset = 0;
  const svg = el.donutSvg;

  // Remove old segments
  svg.querySelectorAll('.donut-segment').forEach(s => s.remove());

  const svgNS = 'http://www.w3.org/2000/svg';

  segments.forEach(seg => {
    const pct = seg.value / total;
    const dash = pct * C;
    const gap = C - dash;

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('class', 'donut-segment');
    circle.setAttribute('cx', '110');
    circle.setAttribute('cy', '110');
    circle.setAttribute('r', String(R));
    circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));
    svg.appendChild(circle);

    offset += dash;
  });

  // Legend
  el.donutLegend.innerHTML = segments.map(s => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${s.color}; box-shadow:0 0 5px ${s.color}88"></div>
      <span class="legend-name">${s.label}</span>
      <span class="legend-pct">${((s.value / total) * 100).toFixed(1)}%</span>
    </div>`).join('');
}

// ----  ANIMATE NUMBER  ----
function animateValue(el, newText) {
  el.classList.remove('animating');
  void el.offsetWidth; // reflow
  el.textContent = newText;
  el.classList.add('animating');
}

// ============================================================
//  SLIDER LABEL
// ============================================================
function updateSliderLabel(salary) {
  const smmlv = CONFIG_2026.SMMLV;
  const mult = (salary / smmlv).toFixed(1);
  el.sliderLabel.textContent = `${mult} SMMLV`;

  // Update CSS fill percentage
  const min = 1_750_905;
  const max = 20_000_000;
  const pct = ((salary - min) / (max - min)) * 100;
  el.salarioSlider.style.setProperty('--pct', pct + '%');
}

// ============================================================
//  RECALCULATE
// ============================================================
function recalculate() {
  if (!state.salario || state.salario < 1) {
    state.salario = CONFIG_2026.SMMLV;
  }
  state.resultado = calcularCostoTotal(state.salario, state.nivelARL, state.incluirSalud, state.incluyeAuxilio);
  render();
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

// Salary input
el.salarioInput.addEventListener('input', function () {
  const raw = stripFormatting(this.value);
  state.salario = raw;
  // Format with dots while typing
  const formatted = raw ? raw.toLocaleString('es-CO') : '';
  const cursorPos = this.selectionStart;
  this.value = formatted;
  // Keep slider in sync
  const clamped = Math.min(Math.max(raw, 1_750_905), 20_000_000);
  el.salarioSlider.value = clamped;
  updateSliderLabel(clamped);
  recalculate();
});

// Salary input: format on focus/blur
el.salarioInput.addEventListener('focus', function () {
  this.value = this.value.replace(/\./g, '');
});

el.salarioInput.addEventListener('blur', function () {
  const raw = stripFormatting(this.value);
  if (raw < CONFIG_2026.SMMLV) {
    state.salario = CONFIG_2026.SMMLV;
  }
  this.value = state.salario.toLocaleString('es-CO');
  el.salarioSlider.value = Math.min(state.salario, 20_000_000);
  updateSliderLabel(state.salario);
  recalculate();
});

// Slider
el.salarioSlider.addEventListener('input', function () {
  const val = parseInt(this.value, 10);
  state.salario = val;
  el.salarioInput.value = val.toLocaleString('es-CO');
  updateSliderLabel(val);
  recalculate();
});

// ARL buttons
el.arlGrid.addEventListener('click', function (e) {
  const btn = e.target.closest('.arl-btn');
  if (!btn) return;
  el.arlGrid.querySelectorAll('.arl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.nivelARL = parseInt(btn.dataset.level, 10);
  recalculate();
});

// Salud toggle
el.toggleSaludCard.addEventListener('click', function () {
  state.incluirSalud = !state.incluirSalud;
  const on = state.incluirSalud;
  el.toggleSaludThumb.classList.toggle('active', on);
  el.toggleSaludState.textContent = on ? 'ON' : 'OFF';
  el.toggleSaludSwitch.classList.toggle('on', on);
  el.toggleSaludSwitch.classList.toggle('off', !on);
  el.toggleSaludCard.classList.toggle('on', on);
  el.toggleSaludCard.classList.toggle('off', !on);
  recalculate();
});

// Initialize toggle visual state
el.toggleSaludSwitch.classList.add('off');
el.toggleSaludCard.classList.add('off');

// Auxilio toggle
el.toggleAuxCard.addEventListener('click', function () {
  state.incluyeAuxilio = !state.incluyeAuxilio;
  const on = state.incluyeAuxilio;
  el.toggleAuxThumb.classList.toggle('active', on);
  el.toggleAuxState.textContent = on ? 'ON' : 'OFF';
  el.toggleAuxSwitch.classList.toggle('on', on);
  el.toggleAuxSwitch.classList.toggle('off', !on);
  el.toggleAuxCard.classList.toggle('on', on);
  el.toggleAuxCard.classList.toggle('off', !on);
  recalculate();
});

// Initialize Auxilio toggle
el.toggleAuxSwitch.classList.add('on');
el.toggleAuxCard.classList.add('on');

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const salary = parseInt(this.dataset.salary, 10);
    const arl = parseInt(this.dataset.arl, 10);
    const exo = this.dataset.exo === 'true';

    state.salario = salary;
    state.nivelARL = arl;
    state.incluirSalud = !exo; // Si exonera (true) => NO incluye salud; si es Gerente (!exo) => SÍ la incluye.

    el.salarioInput.value = salary.toLocaleString('es-CO');
    el.salarioSlider.value = Math.min(salary, 20_000_000);
    updateSliderLabel(salary);

    el.arlGrid.querySelectorAll('.arl-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.level, 10) === arl);
    });

    const on = state.incluirSalud;
    el.toggleSaludThumb.classList.toggle('active', on);
    el.toggleSaludState.textContent = on ? 'ON' : 'OFF';
    el.toggleSaludSwitch.classList.toggle('on', on);
    el.toggleSaludSwitch.classList.toggle('off', !on);
    el.toggleSaludCard.classList.toggle('on', on);
    el.toggleSaludCard.classList.toggle('off', !on);

    recalculate();

    // Bounce animation on preset button
    this.style.transform = 'scale(0.94)';
    setTimeout(() => { this.style.transform = ''; }, 150);
  });
});

// Period toggle
el.btnMonthly.addEventListener('click', () => {
  state.periodoAnual = false;
  el.btnMonthly.classList.add('active');
  el.btnAnnual.classList.remove('active');
  render();
});

el.btnAnnual.addEventListener('click', () => {
  state.periodoAnual = true;
  el.btnAnnual.classList.add('active');
  el.btnMonthly.classList.remove('active');
  render();
});

// ============================================================
//  TOOLTIP
// ============================================================
document.querySelectorAll('.tooltip-trigger').forEach(tip => {
  tip.addEventListener('mouseenter', (e) => {
    el.tooltipPopup.textContent = tip.dataset.tip;
    el.tooltipPopup.classList.add('visible');
  });

  tip.addEventListener('mousemove', (e) => {
    el.tooltipPopup.style.left = (e.clientX + 14) + 'px';
    el.tooltipPopup.style.top = (e.clientY - 10) + 'px';
  });

  tip.addEventListener('mouseleave', () => {
    el.tooltipPopup.classList.remove('visible');
  });
});

// ============================================================
//  BACKGROUND PARTICLES
// ============================================================
(function initParticles() {
  const canvas = document.createElement('canvas');
  const bgCanvas = document.getElementById('bgCanvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  bgCanvas.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    a: Math.random() * 0.4 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  draw();
})();

// ============================================================
//  INITIAL RENDER
// ============================================================
updateSliderLabel(state.salario);
recalculate();

// ============================================================
//  NUEVOS MÓDULOS DE PRODUCCIÓN
// ============================================================

// Inicializar Supabase
const supabaseUrl = CONFIG_APP.SUPABASE_URL;
const supabaseKey = CONFIG_APP.SUPABASE_KEY;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 1. Módulo de Autenticación (Supabase)
const elAuth = {
  overlay: $('loginOverlay'),
  title: $('authTitle'),
  user: $('loginUser'),
  pass: $('loginPass'),
  btn: $('btnLogin'),
  btnReg: $('btnRegister'),
  toggle: $('btnToggleAuth'),
  toggleText: $('authToggleText'),
  error: $('loginError'),
  logout: $('btnLogout')
};

let isRegisterMode = false;

elAuth.toggle.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    elAuth.title.textContent = 'Crear Cuenta';
    elAuth.btn.classList.add('hidden');
    elAuth.btnReg.classList.remove('hidden');
    elAuth.toggleText.textContent = '¿Ya tienes cuenta?';
    elAuth.toggle.textContent = 'Ingresa';
  } else {
    elAuth.title.textContent = 'Acceso Seguro';
    elAuth.btnReg.classList.add('hidden');
    elAuth.btn.classList.remove('hidden');
    elAuth.toggleText.textContent = '¿No tienes cuenta?';
    elAuth.toggle.textContent = 'Regístrate';
  }
  elAuth.error.classList.add('opacity-0');
});

function hideOverlay() {
  elAuth.overlay.style.opacity = '0';
  setTimeout(() => elAuth.overlay.style.display = 'none', 500);
  elAuth.logout.classList.remove('hidden');
}

function showOverlay() {
  elAuth.overlay.style.display = 'flex';
  setTimeout(() => elAuth.overlay.style.opacity = '1', 10);
  elAuth.logout.classList.add('hidden');
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// Escuchar cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') hideOverlay();
  if (event === 'SIGNED_OUT') showOverlay();
});

function showError(msg) {
  elAuth.error.textContent = msg;
  elAuth.error.classList.remove('opacity-0');
}

// Iniciar sesión
elAuth.btn.addEventListener('click', async () => {
  const email = elAuth.user.value.trim();
  const password = elAuth.pass.value.trim();

  if (!email || !password) return showError('Agrega correo y contraseña.');
  elAuth.btn.textContent = 'Cargando...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  elAuth.btn.textContent = 'INGRESAR';
  if (error) {
    showError('Credenciales incorrectas o error de red.');
  } else {
    elAuth.error.classList.add('opacity-0');
    elAuth.user.value = '';
    elAuth.pass.value = '';
  }
});

// Registrarse
elAuth.btnReg.addEventListener('click', async () => {
  const email = elAuth.user.value.trim();
  const password = elAuth.pass.value.trim();

  if (!email || !password || password.length < 6) return showError('Agrega correo válido y contraseña de 6+ chars.');
  elAuth.btnReg.textContent = 'Cargando...';

  const { data, error } = await supabase.auth.signUp({ email, password });

  elAuth.btnReg.textContent = 'REGISTRARSE';
  if (error) {
    showError(error.message);
  } else {
    showError('Registro exitoso. Revisa tu email o ingresa ahora si no requiere confirmación.');
    elAuth.error.classList.remove('text-rose-400');
    elAuth.error.classList.add('text-emerald-400');
    setTimeout(() => {
      elAuth.toggle.click(); // Cambiar a login
    }, 2000);
  }
});

// Cerrar sesión
elAuth.logout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  elAuth.error.classList.add('opacity-0');
  elAuth.error.classList.remove('text-emerald-400');
  elAuth.error.classList.add('text-rose-400');
});

elAuth.pass.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (isRegisterMode) elAuth.btnReg.click();
    else elAuth.btn.click();
  }
});

checkSession(); // Validar sesión inicial

// 2. Módulo de Historial (LocalStorage)
const elHistory = $('historyList');
const MAX_HISTORY = 3;

function saveHistory() {
  if (!state.resultado) return;
  const hList = JSON.parse(localStorage.getItem('calc_history') || '[]');
  const newItem = {
    id: Date.now(),
    date: new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    salary: state.salario,
    total: state.resultado.totalCosto
  };
  hList.unshift(newItem);
  if (hList.length > MAX_HISTORY) hList.pop();
  localStorage.setItem('calc_history', JSON.stringify(hList));
  renderHistory();
}

function renderHistory() {
  const hList = JSON.parse(localStorage.getItem('calc_history') || '[]');
  if (hList.length === 0) return;

  elHistory.innerHTML = hList.map((h, i) => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-indigo-500/20 hover:border-indigo-500/50 transition-colors cursor-pointer group" onclick="loadHistory(${h.salary})">
      <div>
        <div class="text-[0.7rem] text-gray-400 group-hover:text-indigo-300 transition-colors">${h.date}</div>
        <div class="font-bold text-white text-sm">${fmtCOP(h.salary)} <span class="text-xs font-normal text-gray-500">Base</span></div>
      </div>
      <div class="text-right">
        <div class="text-[0.7rem] text-emerald-400 uppercase tracking-widest">Total</div>
        <div class="font-bold text-emerald-300">${fmtCOP(h.total)}</div>
      </div>
    </div>
  `).join('');
}

window.loadHistory = function (salary) {
  state.salario = salary;
  el.salarioInput.value = salary.toLocaleString('es-CO');
  el.salarioSlider.value = Math.min(salary, 20_000_000);
  updateSliderLabel(salary);
  recalculate();
}

// Interceptar el recálculo para guardar historial si cambia significativamente
let lastSavedSalary = null;
const originalRecalc = recalculate;
window.recalculate = function () {
  originalRecalc();
  // Guardar historial solo si el salario cambió, para no spamear
  if (lastSavedSalary !== state.salario && state.salario > 0) {
    if (window._historyTimeout) clearTimeout(window._historyTimeout);
    window._historyTimeout = setTimeout(() => {
      saveHistory();
      lastSavedSalary = state.salario;
    }, 1500); // 1.5s debounce
  }
};
renderHistory(); // Init history ui

// 3. Módulo de Exportación y Soporte Contable
const btnExportPDF = $('btnExportPDF');
const btnExportWA = $('btnExportWA');

btnExportWA.addEventListener('click', () => {
  const r = state.resultado;
  const mult = state.periodoAnual ? 12 : 1;
  const p = state.periodoAnual ? 'Anual' : 'Mensual';

  const text = `*Cálculo Laboral (${p}) - 2026* 📊
*Salario Base:* ${fmtCOP(r.salario * mult)}
*Auxilio Transp:* ${r.tieneAuxilio ? fmtCOP(r.auxTransporte * mult) : 'No aplica'}

*Seg. Social:* ${fmtCOP(r.totalSS * mult)} ${r.exoSS ? '(Salud Exon.)' : ''}
*Prestaciones:* ${fmtCOP(r.totalPrestaciones * mult)}
*Parafiscales:* ${fmtCOP(r.totalParafiscales * mult)}

💰 *COSTO EMPRESA:* ${fmtCOP(r.totalCosto * mult)}

_Calculado vía LaborCost CO_`;

  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnExportWA.innerHTML;
    btnExportWA.innerHTML = `✅ Copiado!`;
    setTimeout(() => btnExportWA.innerHTML = originalText, 2000);
  });
});

btnExportPDF.addEventListener('click', () => {
  // Prepara contenedor temporal para PDF para que se vea limpio
  const originalHtml = el.detailTable.innerHTML;

  // Clonar el panel-results
  const target = document.querySelector('.panel-results').cloneNode(true);

  // Limpiar cosas innecesarias del PDF
  const toggles = target.querySelector('.period-toggle');
  if (toggles) toggles.remove();
  const exportBtns = target.querySelector('.flex.gap-4.px-7');
  if (exportBtns) exportBtns.remove();

  // Forzar que los acordeones de detalles estén abiertos
  const detailsBody = target.querySelectorAll('.detail-group-body');
  detailsBody.forEach(b => b.style.maxHeight = '1000px');

  // Inyectar header con logo y fecha
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="text-align:center; padding: 20px; border-bottom: 2px solid #6366F1; margin-bottom: 20px;">
      <h2 style="color: #14142b; margin:0; font-size:24px;">${CONFIG_2026.COMPANY_NAME}</h2>
      <p style="color: #666; margin: 5px 0 0; font-size: 12px;">Reporte de Costos Laborales - ${new Date().toLocaleString('es-CO')}</p>
    </div>
  `;
  target.insertBefore(header, target.firstChild);

  // Aplicar estilos para PDF
  target.style.background = '#ffffff';
  target.style.color = '#000000';
  target.style.padding = '20px';
  // Adjust font colors for printable
  target.querySelectorAll('*').forEach(el => {
    const color = window.getComputedStyle(el).color;
    if (color === 'rgb(248, 248, 255)' || color.includes('255, 255, 255')) el.style.color = '#333';
  });

  const opt = {
    margin: 0.5,
    filename: `Costo_Laboral_${state.salario}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(target).save().then(() => {
    const originalText = btnExportPDF.innerHTML;
    btnExportPDF.innerHTML = `✅ Descargado!`;
    setTimeout(() => btnExportPDF.innerHTML = originalText, 2000);
  });
});
