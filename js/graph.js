import { state } from './state.js';
import { clamp, round } from './math-utils.js';

const GRID_COLOR = '#e2e8f0';
const AXIS_COLOR = '#475569';
const LINE_COLOR = '#3b82f6';
const POINT_COLOR = '#f59e0b';
const DRAG_COLOR = '#ef4444';
const LABEL_COLOR = '#64748b';
const POINT_RADIUS = 7;
const DRAG_RADIUS = 9;
const DRAG_HIT = 16;

let canvas, ctx;
let width, height;
let viewXMin = -15, viewXMax = 15, viewYMin = -25, viewYMax = 25;

let dragging = null; // 'p1' or 'p2'
let dragP1 = { x: -5, y: 0 };
let dragP2 = { x: 5, y: 0 };

export function initGraph(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', () => { resize(); draw(); });
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp);

  state.onChange(() => { updateDragPoints(); draw(); });
  updateDragPoints();
  draw();
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  width = rect.width;
  height = rect.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toScreen(mathX, mathY) {
  const sx = (mathX - viewXMin) / (viewXMax - viewXMin) * width;
  const sy = (1 - (mathY - viewYMin) / (viewYMax - viewYMin)) * height;
  return { sx, sy };
}

function toMath(sx, sy) {
  const mx = viewXMin + sx / width * (viewXMax - viewXMin);
  const my = viewYMin + (1 - sy / height) * (viewYMax - viewYMin);
  return { mx, my };
}

function updateDragPoints() {
  const m = state.m, b = state.b;
  dragP1 = { x: -5, y: m * -5 + b };
  dragP2 = { x: 5, y: m * 5 + b };
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawAxes();
  drawLine();
  drawDataPoints();
  drawDragHandles();
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  const step = getGridStep(viewXMax - viewXMin, width);
  const startX = Math.ceil(viewXMin / step) * step;
  for (let x = startX; x <= viewXMax; x += step) {
    const { sx } = toScreen(x, 0);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  const stepY = getGridStep(viewYMax - viewYMin, height);
  const startY = Math.ceil(viewYMin / stepY) * stepY;
  for (let y = startY; y <= viewYMax; y += stepY) {
    const { sy } = toScreen(0, y);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }
}

function getGridStep(range, pixels) {
  const rough = range / (pixels / 50);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  if (residual <= 1.5) return mag;
  if (residual <= 3.5) return 2 * mag;
  if (residual <= 7.5) return 5 * mag;
  return 10 * mag;
}

function drawAxes() {
  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = 2;

  // x-axis
  const { sy: yAxis } = toScreen(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, yAxis);
  ctx.lineTo(width, yAxis);
  ctx.stroke();

  // y-axis
  const { sx: xAxis } = toScreen(0, 0);
  ctx.beginPath();
  ctx.moveTo(xAxis, 0);
  ctx.lineTo(xAxis, height);
  ctx.stroke();

  // tick labels
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const stepX = getGridStep(viewXMax - viewXMin, width);
  const startX = Math.ceil(viewXMin / stepX) * stepX;
  for (let x = startX; x <= viewXMax; x += stepX) {
    if (Math.abs(x) < 1e-9) continue;
    const { sx } = toScreen(x, 0);
    ctx.fillText(formatNum(x), sx, yAxis + 4);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const stepY = getGridStep(viewYMax - viewYMin, height);
  const startY = Math.ceil(viewYMin / stepY) * stepY;
  for (let y = startY; y <= viewYMax; y += stepY) {
    if (Math.abs(y) < 1e-9) continue;
    const { sy } = toScreen(0, y);
    ctx.fillText(formatNum(y), xAxis - 6, sy);
  }

  // origin label
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', xAxis - 4, yAxis + 4);
}

function formatNum(n) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function drawLine() {
  const m = state.m, b = state.b;

  const x1 = viewXMin - 1;
  const x2 = viewXMax + 1;
  const y1 = m * x1 + b;
  const y2 = m * x2 + b;

  const s1 = toScreen(x1, y1);
  const s2 = toScreen(x2, y2);

  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s1.sx, s1.sy);
  ctx.lineTo(s2.sx, s2.sy);
  ctx.stroke();
}

function drawDataPoints() {
  for (const p of state.points) {
    const { sx, sy } = toScreen(p.x, p.y);
    ctx.fillStyle = POINT_COLOR;
    ctx.beginPath();
    ctx.arc(sx, sy, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // coordinate label
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`(${formatNum(p.x)}, ${formatNum(p.y)})`, sx + 10, sy - 4);
  }
}

function drawDragHandles() {
  for (const p of [dragP1, dragP2]) {
    const { sx, sy } = toScreen(p.x, p.y);
    const isActive = dragging && ((dragging === 'p1' && p === dragP1) || (dragging === 'p2' && p === dragP2));

    ctx.fillStyle = isActive ? DRAG_COLOR : LINE_COLOR;
    ctx.beginPath();
    ctx.arc(sx, sy, DRAG_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // inner dot
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getPointerMathCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  return toMath(sx, sy);
}

function hitTest(sx, sy) {
  for (const [key, p] of [['p1', dragP1], ['p2', dragP2]]) {
    const s = toScreen(p.x, p.y);
    const dx = sx - s.sx, dy = sy - s.sy;
    if (Math.sqrt(dx * dx + dy * dy) < DRAG_HIT) return key;
  }
  return null;
}

function onPointerDown(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const hit = hitTest(sx, sy);
  if (hit) {
    dragging = hit;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
}

function onPointerMove(e) {
  if (!dragging) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    canvas.style.cursor = hitTest(sx, sy) ? 'grab' : 'default';
    return;
  }

  const { mx, my } = getPointerMathCoords(e);
  if (dragging === 'p1') {
    dragP1 = { x: round(mx, 2), y: round(my, 2) };
  } else {
    dragP2 = { x: round(mx, 2), y: round(my, 2) };
  }

  const dx = dragP2.x - dragP1.x;
  if (Math.abs(dx) < 0.01) return;
  const m = (dragP2.y - dragP1.y) / dx;
  const b = dragP1.y - m * dragP1.x;
  state.setLine(clamp(m, -10, 10), clamp(b, -20, 20), 'drag');
}

function onPointerUp() {
  if (dragging) {
    dragging = null;
    canvas.style.cursor = 'default';
  }
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const sx = touch.clientX - rect.left;
  const sy = touch.clientY - rect.top;
  const hit = hitTest(sx, sy);
  if (hit) {
    dragging = hit;
    e.preventDefault();
  }
}

function onTouchMove(e) {
  if (!dragging || e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const fake = { clientX: touch.clientX, clientY: touch.clientY };
  onPointerMove(fake);
}
