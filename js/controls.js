import { state } from './state.js';
import { round } from './math-utils.js';

let inputM, inputB, sliderM, sliderB, sliderMVal, sliderBVal;
let tableBody, eqText, fitInfo;

export function initControls() {
  inputM = document.getElementById('input-m');
  inputB = document.getElementById('input-b');
  sliderM = document.getElementById('slider-m');
  sliderB = document.getElementById('slider-b');
  sliderMVal = document.getElementById('slider-m-value');
  sliderBVal = document.getElementById('slider-b-value');
  tableBody = document.querySelector('#data-table tbody');
  eqText = document.getElementById('equation-text');
  fitInfo = document.getElementById('fit-info');

  // Equation inputs
  inputM.addEventListener('input', () => {
    const m = parseFloat(inputM.value);
    if (!isNaN(m)) state.setLine(m, state.b, 'equation');
  });
  inputB.addEventListener('input', () => {
    const b = parseFloat(inputB.value);
    if (!isNaN(b)) state.setLine(state.m, b, 'equation');
  });

  // Sliders
  sliderM.addEventListener('input', () => {
    state.setLine(parseFloat(sliderM.value), state.b, 'slider');
  });
  sliderB.addEventListener('input', () => {
    state.setLine(state.m, parseFloat(sliderB.value), 'slider');
  });

  // Table actions
  document.getElementById('btn-add-row').addEventListener('click', () => {
    const pts = state.points;
    const lastX = pts.length > 0 ? pts[pts.length - 1].x : 0;
    state.addPoint(lastX + 5);
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    state.reset();
  });

  state.onChange((source) => syncUI(source));
  syncUI('init');
}

function syncUI(source) {
  const m = state.m;
  const b = state.b;

  // Equation inputs
  if (source !== 'equation') {
    inputM.value = round(m, 2);
    inputB.value = round(b, 2);
  }

  // Sliders
  if (source !== 'slider') {
    sliderM.value = m;
    sliderB.value = b;
  }
  sliderMVal.textContent = round(m, 2);
  sliderBVal.textContent = round(b, 2);

  // Formatted equation
  eqText.textContent = formatEquation(m, b);

  // Table
  if (source !== 'table-cell') {
    renderTable();
  }

  // Fit indicator
  const r2 = state.r2;
  if (r2 < 0.9999) {
    fitInfo.textContent = `Best fit (R² = ${round(r2, 4)}) — points are not perfectly collinear`;
    fitInfo.classList.add('visible');
  } else {
    fitInfo.textContent = '';
    fitInfo.classList.remove('visible');
  }
}

function formatEquation(m, b) {
  const mStr = round(m, 2);
  const bAbs = round(Math.abs(b), 2);

  if (Math.abs(b) < 0.005) return `y = ${mStr}x`;
  const sign = b >= 0 ? '+' : '−';
  return `y = ${mStr}x ${sign} ${bAbs}`;
}

function renderTable() {
  tableBody.innerHTML = '';
  state.points.forEach((p, i) => {
    const tr = document.createElement('tr');

    const tdX = document.createElement('td');
    const inX = document.createElement('input');
    inX.type = 'number';
    inX.value = p.x;
    inX.className = 'table-input';
    inX.addEventListener('change', () => onCellEdit(i, 'x', inX.value));
    tdX.appendChild(inX);

    const tdY = document.createElement('td');
    const inY = document.createElement('input');
    inY.type = 'number';
    inY.value = round(p.y, 2);
    inY.className = 'table-input';
    inY.addEventListener('change', () => onCellEdit(i, 'y', inY.value));
    tdY.appendChild(inY);

    const tdDel = document.createElement('td');
    if (state.points.length > 2) {
      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.className = 'btn-delete';
      btn.title = 'Remove point';
      btn.addEventListener('click', () => state.removePoint(i));
      tdDel.appendChild(btn);
    }

    tr.append(tdX, tdY, tdDel);
    tableBody.appendChild(tr);
  });
}

function onCellEdit(index, axis, rawValue) {
  const val = parseFloat(rawValue);
  if (isNaN(val)) return;
  const pts = state.points.map(p => ({ ...p }));
  pts[index][axis] = val;
  state.setPoints(pts, 'table-cell');
}
