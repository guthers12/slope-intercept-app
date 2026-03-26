(function () {
  'use strict';

  // ============================================================
  // math-utils
  // ============================================================

  function linearRegression(points) {
    var n = points.length;
    if (n < 2) return null;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += points[i].x; sumY += points[i].y;
      sumXY += points[i].x * points[i].y;
      sumX2 += points[i].x * points[i].x;
    }
    var denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return null;
    var m = (n * sumXY - sumX * sumY) / denom;
    var b = (sumY - m * sumX) / n;
    var meanY = sumY / n;
    var ssTot = 0, ssRes = 0;
    for (var j = 0; j < n; j++) {
      ssTot += (points[j].y - meanY) * (points[j].y - meanY);
      ssRes += (points[j].y - (m * points[j].x + b)) * (points[j].y - (m * points[j].x + b));
    }
    var r2 = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
    return { m: round(m, 4), b: round(b, 4), r2: round(r2, 6) };
  }

  /** Least-squares line constrained to pass through points[fixedIdx]. */
  function constrainedRegression(points, fixedIdx) {
    var n = points.length;
    if (n < 2) return null;
    var x0 = points[fixedIdx].x, y0 = points[fixedIdx].y;

    if (n === 2) {
      var other = fixedIdx === 0 ? 1 : 0;
      var dx = points[other].x - x0;
      if (Math.abs(dx) < 1e-12) return null;
      var m = (points[other].y - y0) / dx;
      return { m: round(m, 4), b: round(y0 - m * x0, 4) };
    }

    var sumDxDy = 0, sumDx2 = 0;
    for (var i = 0; i < n; i++) {
      var ddx = points[i].x - x0;
      var ddy = points[i].y - y0;
      sumDxDy += ddx * ddy;
      sumDx2 += ddx * ddx;
    }
    if (Math.abs(sumDx2) < 1e-12) return null;
    var mC = sumDxDy / sumDx2;
    return { m: round(mC, 4), b: round(y0 - mC * x0, 4) };
  }

  function round(v, d) {
    var f = Math.pow(10, d);
    return Math.round(v * f) / f;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function snapVal(v) {
    return state.snapToInt ? Math.round(v) : v;
  }

  function isOnLine(px, py, m, b) {
    return Math.abs(py - (m * px + b)) < 0.15;
  }

  function randInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  // ============================================================
  // state
  // ============================================================

  var DEFAULT_POINTS = [
    { x: -3, y: -13 },
    { x:  2, y:   2 },
    { x:  7, y:  17 },
    { x: 12, y:  32 }
  ];

  var state = {
    _m: 3, _b: -4, _r2: 1,
    _points: DEFAULT_POINTS.map(function (p) { return { x: p.x, y: p.y }; }),
    _listeners: [],
    _updating: false,

    showTriangle: true,
    showSteps: true,
    snapToInt: true,

    get m()  { return this._m; },
    get b()  { return this._b; },
    get r2() { return this._r2; },
    get points() { return this._points; },

    onChange: function (fn) { this._listeners.push(fn); },

    _notify: function (source) {
      if (this._updating) return;
      this._updating = true;
      for (var i = 0; i < this._listeners.length; i++) this._listeners[i](source);
      this._updating = false;
    },

    setLine: function (m, b, source) {
      m = clamp(m, -10, 10);
      b = clamp(b, -20, 20);
      this._m = round(snapVal(m), 4);
      this._b = round(snapVal(b), 4);
      for (var i = 0; i < this._points.length; i++) {
        this._points[i].y = round(this._m * this._points[i].x + this._b, 4);
      }
      this._r2 = 1;
      this._notify(source || 'unknown');
    },

    setPoints: function (points, source) {
      this._points = points.map(function (p) { return { x: p.x, y: p.y }; });
      var reg = linearRegression(this._points);
      if (reg) {
        this._m = reg.m;
        this._b = reg.b;
        this._r2 = reg.r2;
      }
      this._notify(source || 'table');
    },

    /** Move a point and fit the line through it (constrained regression). */
    movePoint: function (index, x, y) {
      x = snapVal(x);
      y = snapVal(y);
      this._points[index] = { x: round(x, 2), y: round(y, 2) };
      var reg = constrainedRegression(this._points, index);
      if (reg) {
        this._m = reg.m;
        this._b = reg.b;
      }
      var fullReg = linearRegression(this._points);
      this._r2 = fullReg ? fullReg.r2 : 1;
      this._notify('drag');
    },

    addPoint: function (x) {
      var y = round(this._m * x + this._b, 4);
      this._points.push({ x: x, y: y });
      this._notify('table');
    },

    removePoint: function (index) {
      if (this._points.length <= 2) return;
      this._points.splice(index, 1);
      var reg = linearRegression(this._points);
      if (reg) { this._m = reg.m; this._b = reg.b; this._r2 = reg.r2; }
      this._notify('table');
    },

    randomize: function () {
      var m = randInt(-5, 5);
      var b = randInt(-10, 10);
      var xs = [];
      var used = {};
      while (xs.length < 4) {
        var x = randInt(-8, 12);
        if (!used[x]) { used[x] = true; xs.push(x); }
      }
      xs.sort(function (a, c) { return a - c; });
      this._points = xs.map(function (x) { return { x: x, y: m * x + b }; });
      this._m = m;
      this._b = b;
      this._r2 = 1;
      this._notify('reset');
    },

    reset: function () {
      this._points = DEFAULT_POINTS.map(function (p) { return { x: p.x, y: p.y }; });
      this._m = 3; this._b = -4; this._r2 = 1;
      this._notify('reset');
    }
  };

  // ============================================================
  // graph
  // ============================================================

  var GRID_COLOR  = '#e2e8f0';
  var AXIS_COLOR  = '#475569';
  var LINE_COLOR  = '#3b82f6';
  var COLOR_M     = '#e67e22';
  var COLOR_B     = '#0ea5e9';
  var COLOR_POINT = '#f59e0b';
  var COLOR_OFF   = '#b0b8c4';
  var LABEL_COLOR = '#64748b';
  var STEP_COLOR  = '#94a3b8';
  var POINT_RADIUS = 8;
  var POINT_HIT    = 18;

  var canvas, ctx, width, height;
  var viewXMin = -16, viewXMax = 16, viewYMin = -35, viewYMax = 38;

  var draggingIdx = -1;

  function initGraph(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', function () { resize(); draw(); });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    state.onChange(function () { draw(); });
    draw();
  }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    width = rect.width; height = rect.height;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function toScreen(mx, my) {
    return {
      sx: (mx - viewXMin) / (viewXMax - viewXMin) * width,
      sy: (1 - (my - viewYMin) / (viewYMax - viewYMin)) * height
    };
  }

  function toMath(sx, sy) {
    return {
      mx: viewXMin + sx / width * (viewXMax - viewXMin),
      my: viewYMin + (1 - sy / height) * (viewYMax - viewYMin)
    };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawAxes();
    drawLine();
    if (state.showSteps) drawStepPoints();
    if (state.showTriangle) drawRiseRunTriangle();
    drawBIntercept();
    drawDataPoints();
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    var stepX = gridStep(viewXMax - viewXMin, width);
    for (var x = Math.ceil(viewXMin / stepX) * stepX; x <= viewXMax; x += stepX) {
      var s = toScreen(x, 0);
      ctx.beginPath(); ctx.moveTo(s.sx, 0); ctx.lineTo(s.sx, height); ctx.stroke();
    }
    var stepY = gridStep(viewYMax - viewYMin, height);
    for (var y = Math.ceil(viewYMin / stepY) * stepY; y <= viewYMax; y += stepY) {
      var s2 = toScreen(0, y);
      ctx.beginPath(); ctx.moveTo(0, s2.sy); ctx.lineTo(width, s2.sy); ctx.stroke();
    }
  }

  function gridStep(range, px) {
    var raw = range / (px / 50);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var r = raw / mag;
    if (r <= 1.5) return mag;
    if (r <= 3.5) return 2 * mag;
    if (r <= 7.5) return 5 * mag;
    return 10 * mag;
  }

  function drawAxes() {
    var o = toScreen(0, 0);
    ctx.strokeStyle = AXIS_COLOR; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, o.sy); ctx.lineTo(width, o.sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.sx, 0); ctx.lineTo(o.sx, height); ctx.stroke();

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '11px system-ui, sans-serif';

    var stepX = gridStep(viewXMax - viewXMin, width);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var x = Math.ceil(viewXMin / stepX) * stepX; x <= viewXMax; x += stepX) {
      if (Math.abs(x) < 0.01) continue;
      var sx = toScreen(x, 0);
      ctx.fillText(fmtN(x), sx.sx, o.sy + 4);
    }

    var stepY = gridStep(viewYMax - viewYMin, height);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var y = Math.ceil(viewYMin / stepY) * stepY; y <= viewYMax; y += stepY) {
      if (Math.abs(y) < 0.01) continue;
      var sy = toScreen(0, y);
      ctx.fillText(fmtN(y), o.sx - 6, sy.sy);
    }

    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('0', o.sx - 4, o.sy + 4);
  }

  function fmtN(n) {
    return Math.abs(n - Math.round(n)) < 0.01 ? Math.round(n).toString() : n.toFixed(1);
  }

  function drawLine() {
    var m = state.m, b = state.b;
    var s1 = toScreen(viewXMin - 2, m * (viewXMin - 2) + b);
    var s2 = toScreen(viewXMax + 2, m * (viewXMax + 2) + b);
    ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s1.sx, s1.sy); ctx.lineTo(s2.sx, s2.sy); ctx.stroke();
  }

  // ---- Y-intercept marker ----

  function drawBIntercept() {
    var b = state.b;
    var s = toScreen(0, b);

    ctx.fillStyle = COLOR_B;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.stroke();

    var label = 'b = ' + fmtN(b);
    ctx.font = 'bold 12px system-ui, sans-serif';
    drawLabelWithBG(label, s.sx + 14, s.sy, 'left', 'middle', COLOR_B);
  }

  // ---- Rise / Run triangle ----

  function drawRiseRunTriangle() {
    var m = state.m, b = state.b;
    if (Math.abs(m) < 0.001) return;

    var x0 = 0, y0 = b;
    var x1 = 1, y1 = b + m;

    var sA = toScreen(x0, y0);
    var sB = toScreen(x1, y0);
    var sC = toScreen(x1, y1);

    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2.5;

    ctx.strokeStyle = COLOR_B;
    ctx.beginPath(); ctx.moveTo(sA.sx, sA.sy); ctx.lineTo(sB.sx, sB.sy); ctx.stroke();

    ctx.strokeStyle = COLOR_M;
    ctx.beginPath(); ctx.moveTo(sB.sx, sB.sy); ctx.lineTo(sC.sx, sC.sy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
    ctx.beginPath();
    ctx.moveTo(sA.sx, sA.sy);
    ctx.lineTo(sB.sx, sB.sy);
    ctx.lineTo(sC.sx, sC.sy);
    ctx.closePath();
    ctx.fill();

    var runLabelY = sA.sy + (m > 0 ? 16 : -10);
    drawLabelWithBG('run = 1', (sA.sx + sB.sx) / 2, runLabelY, 'center', m > 0 ? 'top' : 'bottom', COLOR_B);

    drawLabelWithBG('rise = ' + fmtN(m), sB.sx + 6, (sB.sy + sC.sy) / 2, 'left', 'middle', COLOR_M);
  }

  /** Draw text with a semi-opaque white background for readability. */
  function drawLabelWithBG(text, x, y, align, baseline, color) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    var metrics = ctx.measureText(text);
    var tw = metrics.width;
    var th = 14;
    var px = 3, py = 2;

    var bx = x - px;
    if (align === 'center') bx = x - tw / 2 - px;
    else if (align === 'right') bx = x - tw - px;
    var by = y - th / 2 - py;
    if (baseline === 'top') by = y - py;
    else if (baseline === 'bottom') by = y - th - py;

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(bx, by, tw + px * 2, th + py * 2);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // ---- Step points ----

  function drawStepPoints() {
    var m = state.m, b = state.b;
    var minX = Math.ceil(viewXMin);
    var maxX = Math.floor(viewXMax);
    var size = 4;

    ctx.fillStyle = STEP_COLOR;
    for (var x = minX; x <= maxX; x++) {
      var y = m * x + b;
      if (y < viewYMin || y > viewYMax) continue;
      var s = toScreen(x, y);

      ctx.save();
      ctx.translate(s.sx, s.sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  // ---- Data points (draggable) ----

  function drawDataPoints() {
    var pts = state.points;
    var m = state.m, b = state.b;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var s = toScreen(p.x, p.y);
      var isActive = draggingIdx === i;
      var onLine = isOnLine(p.x, p.y, m, b);
      var r = isActive ? POINT_RADIUS + 2 : POINT_RADIUS;

      var fillColor;
      if (isActive) fillColor = '#f97316';
      else if (onLine) fillColor = COLOR_POINT;
      else fillColor = COLOR_OFF;

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = onLine ? LABEL_COLOR : COLOR_OFF;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('(' + fmtN(p.x) + ', ' + fmtN(p.y) + ')', s.sx + 12, s.sy - 6);
    }
  }

  // ---- Pointer / drag interaction ----

  function hitTestPoints(sx, sy) {
    var pts = state.points;
    var best = -1, bestDist = POINT_HIT;
    for (var i = 0; i < pts.length; i++) {
      var s = toScreen(pts[i].x, pts[i].y);
      var d = Math.sqrt((sx - s.sx) * (sx - s.sx) + (sy - s.sy) * (sy - s.sy));
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function screenCoords(e) {
    var r = canvas.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  }

  function onDown(e) {
    var sc = screenCoords(e);
    var idx = hitTestPoints(sc.sx, sc.sy);
    if (idx >= 0) {
      draggingIdx = idx;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  function onMove(e) {
    if (draggingIdx < 0) {
      var sc = screenCoords(e);
      canvas.style.cursor = hitTestPoints(sc.sx, sc.sy) >= 0 ? 'grab' : 'default';
      return;
    }
    var sc2 = screenCoords(e);
    var mc = toMath(sc2.sx, sc2.sy);
    state.movePoint(draggingIdx, mc.mx, mc.my);
  }

  function onUp() {
    if (draggingIdx >= 0) { draggingIdx = -1; canvas.style.cursor = 'default'; }
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    var idx = hitTestPoints(t.clientX - r.left, t.clientY - r.top);
    if (idx >= 0) { draggingIdx = idx; e.preventDefault(); }
  }

  function onTouchMove(e) {
    if (draggingIdx < 0 || e.touches.length !== 1) return;
    e.preventDefault();
    var t = e.touches[0];
    onMove({ clientX: t.clientX, clientY: t.clientY });
  }

  // ============================================================
  // controls
  // ============================================================

  var inputM, inputB, sliderM, sliderB, sliderMVal, sliderBVal;
  var tableBody, fitInfo, legendMVal, legendBVal;
  var toggleTriangle, toggleSteps, toggleSnap;

  function initControls() {
    inputM     = document.getElementById('input-m');
    inputB     = document.getElementById('input-b');
    sliderM    = document.getElementById('slider-m');
    sliderB    = document.getElementById('slider-b');
    sliderMVal = document.getElementById('slider-m-value');
    sliderBVal = document.getElementById('slider-b-value');
    tableBody  = document.querySelector('#data-table tbody');
    fitInfo    = document.getElementById('fit-info');
    legendMVal = document.getElementById('legend-m-val');
    legendBVal = document.getElementById('legend-b-val');
    toggleTriangle = document.getElementById('toggle-triangle');
    toggleSteps    = document.getElementById('toggle-steps');
    toggleSnap     = document.getElementById('toggle-snap');

    inputM.addEventListener('input', function () {
      var v = parseFloat(inputM.value);
      if (!isNaN(v)) state.setLine(v, state.b, 'equation');
    });
    inputB.addEventListener('input', function () {
      var v = parseFloat(inputB.value);
      if (!isNaN(v)) state.setLine(state.m, v, 'equation');
    });

    sliderM.addEventListener('input', function () {
      var v = parseFloat(sliderM.value);
      v = snapZero(v, 0.15);
      state.setLine(v, state.b, 'slider');
    });
    sliderB.addEventListener('input', function () {
      var v = parseFloat(sliderB.value);
      v = snapZero(v, 0.4);
      state.setLine(state.m, v, 'slider');
    });

    document.getElementById('btn-add-row').addEventListener('click', function () {
      var pts = state.points;
      var lastX = pts.length > 0 ? pts[pts.length - 1].x : 0;
      state.addPoint(lastX + 5);
    });
    document.getElementById('btn-random').addEventListener('click', function () {
      state.randomize();
    });
    document.getElementById('btn-reset').addEventListener('click', function () {
      state.reset();
    });

    toggleTriangle.addEventListener('change', function () {
      state.showTriangle = toggleTriangle.checked;
      draw();
    });
    toggleSteps.addEventListener('change', function () {
      state.showSteps = toggleSteps.checked;
      draw();
    });
    toggleSnap.addEventListener('change', function () {
      state.snapToInt = toggleSnap.checked;
      applySnapSettings();
      if (state.snapToInt) {
        state.setLine(Math.round(state.m), Math.round(state.b), 'snap');
      }
    });

    applySnapSettings();
    state.onChange(function (source) { syncUI(source); });
    syncUI('init');
  }

  function applySnapSettings() {
    var snap = state.snapToInt;
    sliderM.step = snap ? '1' : '0.1';
    sliderB.step = snap ? '1' : '0.5';
    inputM.step  = snap ? '1' : '0.1';
    inputB.step  = snap ? '1' : '0.5';
  }

  function snapZero(v, threshold) {
    return Math.abs(v) < threshold ? 0 : v;
  }

  function syncUI(source) {
    var m = state.m, b = state.b;

    if (source !== 'equation') {
      inputM.value = round(m, 2);
      inputB.value = round(b, 2);
    }
    if (source !== 'slider') {
      sliderM.value = m;
      sliderB.value = b;
    }
    sliderMVal.textContent = round(m, 2);
    sliderBVal.textContent = round(b, 2);

    legendMVal.textContent = round(m, 2);
    legendBVal.textContent = round(b, 2);

    if (source !== 'table-cell') renderTable();

    var r2 = state.r2;
    if (r2 < 0.9999) {
      fitInfo.textContent = 'Best fit (R\u00B2 = ' + round(r2, 4) + ') \u2014 points are not perfectly collinear';
      fitInfo.classList.add('visible');
    } else {
      fitInfo.textContent = '';
      fitInfo.classList.remove('visible');
    }
  }

  function renderTable() {
    tableBody.innerHTML = '';
    var pts = state.points;
    var m = state.m, b = state.b;
    for (var i = 0; i < pts.length; i++) {
      (function (idx) {
        var p = pts[idx];
        var onLine = isOnLine(p.x, p.y, m, b);
        var tr = document.createElement('tr');
        if (!onLine) tr.className = 'table-row-offline';

        var tdX = document.createElement('td');
        var inX = document.createElement('input');
        inX.type = 'number'; inX.value = round(p.x, 2);
        inX.className = 'table-input';
        inX.step = state.snapToInt ? '1' : 'any';
        inX.addEventListener('change', function () { onCellEdit(idx, 'x', this.value); });
        tdX.appendChild(inX);

        var tdY = document.createElement('td');
        var inY = document.createElement('input');
        inY.type = 'number'; inY.value = round(p.y, 2);
        inY.className = 'table-input';
        inY.step = state.snapToInt ? '1' : 'any';
        inY.addEventListener('change', function () { onCellEdit(idx, 'y', this.value); });
        tdY.appendChild(inY);

        var tdDel = document.createElement('td');
        if (pts.length > 2) {
          var btn = document.createElement('button');
          btn.textContent = '\u00D7';
          btn.className = 'btn-delete';
          btn.title = 'Remove point';
          btn.addEventListener('click', function () { state.removePoint(idx); });
          tdDel.appendChild(btn);
        }

        tr.appendChild(tdX); tr.appendChild(tdY); tr.appendChild(tdDel);
        tableBody.appendChild(tr);
      })(i);
    }
  }

  function onCellEdit(index, axis, raw) {
    var val = parseFloat(raw);
    if (isNaN(val)) return;
    if (state.snapToInt) val = Math.round(val);
    var pts = state.points.map(function (p) { return { x: p.x, y: p.y }; });
    pts[index][axis] = val;
    state.setPoints(pts, 'table-cell');
  }

  // ============================================================
  // init
  // ============================================================

  document.addEventListener('DOMContentLoaded', function () {
    initGraph(document.getElementById('graph'));
    initControls();
  });

})();
