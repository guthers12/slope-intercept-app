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
    { x: -1, y: -7 },
    { x:  3, y:  5 }
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

    /**
     * Move a point. The line is defined by the dragged point and the
     * farthest other point (by x-distance), so endpoints anchor each
     * other and middle points are the ones that go off-line.
     */
    movePoint: function (index, x, y) {
      x = snapVal(x);
      y = snapVal(y);
      this._points[index] = { x: round(x, 2), y: round(y, 2) };

      var anchorIdx = -1, maxDist = -1;
      for (var i = 0; i < this._points.length; i++) {
        if (i === index) continue;
        var dist = Math.abs(this._points[i].x - x);
        if (dist > maxDist) { maxDist = dist; anchorIdx = i; }
      }

      if (anchorIdx >= 0) {
        var anchor = this._points[anchorIdx];
        var dx = x - anchor.x;
        if (Math.abs(dx) > 0.001) {
          this._m = round((y - anchor.y) / dx, 4);
          this._b = round(anchor.y - this._m * anchor.x, 4);
        }
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
      var pad = 2;
      var xLo = Math.ceil(viewXMin + pad);
      var xHi = Math.floor(viewXMax - pad);
      var yLo = Math.ceil(viewYMin + pad);
      var yHi = Math.floor(viewYMax - pad);
      if (xLo >= xHi || yLo >= yHi) { xLo = -6; xHi = 6; yLo = -8; yHi = 8; }

      var xMid = Math.round((xLo + xHi) / 2);
      var x1 = randInt(xLo, xMid - 1);
      var x2 = randInt(xMid + 1, xHi);
      if (x1 === x2) x2 = x1 + 2;

      for (var attempt = 0; attempt < 20; attempt++) {
        var m = randInt(-5, 5);
        var b = randInt(yLo, yHi);
        var y1 = m * x1 + b;
        var y2 = m * x2 + b;
        if (y1 >= yLo && y1 <= yHi && y2 >= yLo && y2 <= yHi) {
          this._points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
          this._m = m; this._b = b; this._r2 = 1;
          this._notify('reset');
          return;
        }
      }
      this._points = [{ x: x1, y: 0 }, { x: x2, y: 0 }];
      this._m = 0; this._b = 0; this._r2 = 1;
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
  var COLOR_RUN   = '#22c55e';
  var COLOR_POINT = '#f59e0b';
  var COLOR_OFF   = '#b0b8c4';
  var LABEL_COLOR = '#64748b';
  var STEP_COLOR  = '#94a3b8';
  var POINT_RADIUS = 8;
  var POINT_HIT    = 18;

  var canvas, ctx, width, height;
  var viewXMin = -12, viewXMax = 12, viewYMin = -12, viewYMax = 12;

  var draggingIdx = -1;
  var panning = false;
  var panLastX = 0, panLastY = 0;

  function initGraph(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', function () { resize(); draw(); });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
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
    enforceSquareGrid();
  }

  function enforceSquareGrid() {
    var uppX = (viewXMax - viewXMin) / width;
    var uppY = (viewYMax - viewYMin) / height;
    if (uppX > uppY) {
      var rangeY = uppX * height;
      var cy = (viewYMin + viewYMax) / 2;
      viewYMin = cy - rangeY / 2;
      viewYMax = cy + rangeY / 2;
    } else {
      var rangeX = uppY * width;
      var cx = (viewXMin + viewXMax) / 2;
      viewXMin = cx - rangeX / 2;
      viewXMax = cx + rangeX / 2;
    }
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

  // ---- Zoom ----

  function onWheel(e) {
    e.preventDefault();
    if (tutorialActive && !tut.allowPanZoom) return;
    var sc = screenCoords(e);
    var mc = toMath(sc.sx, sc.sy);
    var factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;

    var newXMin = mc.mx + (viewXMin - mc.mx) * factor;
    var newXMax = mc.mx + (viewXMax - mc.mx) * factor;
    var newYMin = mc.my + (viewYMin - mc.my) * factor;
    var newYMax = mc.my + (viewYMax - mc.my) * factor;

    var xRange = newXMax - newXMin;
    var yRange = newYMax - newYMin;
    if (xRange < 4 || yRange < 4 || xRange > 200 || yRange > 200) return;

    viewXMin = newXMin; viewXMax = newXMax;
    viewYMin = newYMin; viewYMax = newYMax;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawAxes();
    if (tutorialActive) {
      if (tut.showLine) {
        if (tut.lineOpacity != null) { ctx.save(); ctx.globalAlpha = tut.lineOpacity; drawLine(); ctx.restore(); }
        else drawLine();
      }
      tutorialOverlay();
    } else {
      drawLine();
      if (state.showSteps) drawStepPoints();
      if (state.showTriangle) drawRiseRunTriangle();
      drawBIntercept();
      drawDataPoints();
    }
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    var step = uniformGridStep();
    for (var x = Math.ceil(viewXMin / step) * step; x <= viewXMax; x += step) {
      var s = toScreen(x, 0);
      ctx.beginPath(); ctx.moveTo(s.sx, 0); ctx.lineTo(s.sx, height); ctx.stroke();
    }
    for (var y = Math.ceil(viewYMin / step) * step; y <= viewYMax; y += step) {
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

  function uniformGridStep() {
    return Math.max(
      gridStep(viewXMax - viewXMin, width),
      gridStep(viewYMax - viewYMin, height)
    );
  }

  function drawAxes() {
    var o = toScreen(0, 0);
    ctx.strokeStyle = AXIS_COLOR; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, o.sy); ctx.lineTo(width, o.sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.sx, 0); ctx.lineTo(o.sx, height); ctx.stroke();

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '11px system-ui, sans-serif';

    var step = uniformGridStep();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var x = Math.ceil(viewXMin / step) * step; x <= viewXMax; x += step) {
      if (Math.abs(x) < 0.01) continue;
      var sx = toScreen(x, 0);
      ctx.fillText(fmtN(x), sx.sx, o.sy + 4);
    }

    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var y = Math.ceil(viewYMin / step) * step; y <= viewYMax; y += step) {
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
    var dotR = 4;
    var m = state.m;

    var labelOnLeft = state.showTriangle && Math.abs(m) > 0.001;
    var labelAbove = m > 0;

    var offsetX = labelOnLeft ? -22 : 22;
    var offsetY = labelAbove ? -16 : 16;
    var labelX = s.sx + offsetX;
    var labelY = s.sy + offsetY;
    var align = labelOnLeft ? 'right' : 'left';

    ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.sx + (labelOnLeft ? -dotR : dotR), s.sy);
    ctx.lineTo(labelX + (labelOnLeft ? 2 : -2), labelY);
    ctx.stroke();

    ctx.fillStyle = COLOR_B;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.stroke();

    drawLabelWithBG('b = ' + fmtN(b), labelX, labelY, align, 'middle', COLOR_B);
  }

  // ---- Rise / Run triangle ----

  function drawRiseRunTriangle() {
    var m = state.m, b = state.b;
    if (Math.abs(m) < 0.001) return;

    var sA = toScreen(0, b);
    var sB = toScreen(1, b);
    var sC = toScreen(1, b + m);

    ctx.setLineDash([]);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(sA.sx, sA.sy); ctx.lineTo(sB.sx, sB.sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sB.sx, sB.sy); ctx.lineTo(sC.sx, sC.sy); ctx.stroke();

    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2.5;

    ctx.strokeStyle = COLOR_RUN;
    ctx.beginPath(); ctx.moveTo(sA.sx, sA.sy); ctx.lineTo(sB.sx, sB.sy); ctx.stroke();

    ctx.strokeStyle = COLOR_M;
    ctx.beginPath(); ctx.moveTo(sB.sx, sB.sy); ctx.lineTo(sC.sx, sC.sy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.06)';
    ctx.beginPath();
    ctx.moveTo(sA.sx, sA.sy);
    ctx.lineTo(sB.sx, sB.sy);
    ctx.lineTo(sC.sx, sC.sy);
    ctx.closePath();
    ctx.fill();

    var runLabelY = sA.sy + (m > 0 ? 16 : -10);
    drawLabelWithBG('run = 1', (sA.sx + sB.sx) / 2, runLabelY, 'center', m > 0 ? 'top' : 'bottom', COLOR_RUN);
    drawLabelWithBG('rise = ' + fmtN(m), sB.sx + 6, (sB.sy + sC.sy) / 2, 'left', 'middle', COLOR_M);
  }

  function drawLabelWithBG(text, x, y, align, baseline, color) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    var tw = ctx.measureText(text).width;
    var th = 14, px = 4, py = 3;

    var bx = x - px;
    if (align === 'center') bx = x - tw / 2 - px;
    else if (align === 'right') bx = x - tw - px;
    var by = y - th / 2 - py;
    if (baseline === 'top') by = y - py;
    else if (baseline === 'bottom') by = y - th - py;

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
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
    var idx = tutorialActive ? -1 : hitTestPoints(sc.sx, sc.sy);
    if (idx >= 0) {
      draggingIdx = idx;
      canvas.style.cursor = 'grabbing';
    } else if (!tutorialActive || tut.allowPanZoom) {
      panning = true;
      panLastX = sc.sx;
      panLastY = sc.sy;
      canvas.style.cursor = 'grabbing';
    }
    e.preventDefault();
  }

  function onMove(e) {
    var sc = screenCoords(e);
    if (panning) {
      var dx = (sc.sx - panLastX) / width * (viewXMax - viewXMin);
      var dy = (sc.sy - panLastY) / height * (viewYMax - viewYMin);
      viewXMin -= dx; viewXMax -= dx;
      viewYMin += dy; viewYMax += dy;
      panLastX = sc.sx; panLastY = sc.sy;
      draw();
      return;
    }
    if (draggingIdx < 0) {
      canvas.style.cursor = hitTestPoints(sc.sx, sc.sy) >= 0 ? 'grab' : 'default';
      return;
    }
    var mc = toMath(sc.sx, sc.sy);
    state.movePoint(draggingIdx, mc.mx, mc.my);
  }

  function onUp() {
    draggingIdx = -1;
    panning = false;
    canvas.style.cursor = 'default';
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    var sx = t.clientX - r.left, sy = t.clientY - r.top;
    var idx = hitTestPoints(sx, sy);
    if (idx >= 0) {
      draggingIdx = idx;
    } else if (!tutorialActive || tut.allowPanZoom) {
      panning = true;
      panLastX = sx;
      panLastY = sy;
    }
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (e.touches.length !== 1) return;
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
    sliderB.step = snap ? '1' : '0.1';
    inputM.step  = snap ? '1' : '0.1';
    inputB.step  = snap ? '1' : '0.1';
  }

  function snapZero(v, threshold) {
    return Math.abs(v) < threshold ? 0 : v;
  }

  function syncUI(source) {
    var m = state.m, b = state.b;

    if (source !== 'equation') {
      inputM.value = round(m, 1);
      inputB.value = round(b, 1);
    }
    if (source !== 'slider') {
      sliderM.value = m;
      sliderB.value = b;
    }
    sliderMVal.textContent = round(m, 1);
    sliderBVal.textContent = round(b, 1);

    legendMVal.textContent = round(m, 1);
    legendBVal.textContent = round(b, 1);

    if (source !== 'table-cell') renderTable();

    var r2 = state.r2;
    if (r2 < 0.9999) {
      fitInfo.textContent = 'Gray dots are no longer on the line';
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
        inX.type = 'number'; inX.value = round(p.x, 1);
        inX.className = 'table-input';
        inX.step = state.snapToInt ? '1' : 'any';
        inX.addEventListener('change', function () { onCellEdit(idx, 'x', this.value); });
        tdX.appendChild(inX);

        var tdY = document.createElement('td');
        var inY = document.createElement('input');
        inY.type = 'number'; inY.value = round(p.y, 1);
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
  // tutorial — animation helpers
  // ============================================================

  var TIMING = { beat: 500, fast: 300, normal: 600, slow: 1000, stairStep: 400 };

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function tweenAnimate(opts) {
    var duration = opts.duration || TIMING.normal;
    var onUpdate = opts.onUpdate || function () {};
    var onDone = opts.onDone || function () {};
    var easing = opts.easing || easeInOut;
    var startTime = null;
    var stopped = false;
    var rafId;

    function tick(ts) {
      if (stopped) return;
      if (!startTime) startTime = ts;
      var t = Math.min((ts - startTime) / duration, 1);
      onUpdate(easing(t));
      if (t < 1) { rafId = requestAnimationFrame(tick); }
      else { onDone(); }
    }

    rafId = requestAnimationFrame(tick);
    return { cancel: function () { if (!stopped) { stopped = true; cancelAnimationFrame(rafId); } } };
  }

  function tweenDelay(ms, onDone) {
    var id = setTimeout(onDone || function () {}, ms);
    return { cancel: function () { clearTimeout(id); } };
  }

  function tweenSequence(fns, onDone) {
    var idx = 0, current = null, stopped = false;
    function next() {
      if (stopped || idx >= fns.length) { if (!stopped && onDone) onDone(); return; }
      current = fns[idx](function () { idx++; current = null; next(); });
    }
    next();
    return { cancel: function () { stopped = true; if (current) current.cancel(); } };
  }

  // ============================================================
  // tutorial — overlay state
  // ============================================================

  var tutorialActive = false;

  var tut = {
    showLine: false,
    showBDot: false,
    bDotY: null,
    axisHighlight: null,
    axisArrow: null,
    canvasTexts: [],
    staircase: null,
    stepDots: [],
    allowPanZoom: true,
    coordLabel: null,
    lineOpacity: null
  };

  function resetTutorialOverlays() {
    tut.showLine = false;
    tut.showBDot = false;
    tut.bDotY = null;
    tut.axisHighlight = null;
    tut.axisArrow = null;
    tut.canvasTexts = [];
    tut.staircase = null;
    tut.stepDots = [];
    tut.allowPanZoom = true;
    tut.coordLabel = null;
    tut.lineOpacity = null;
  }

  // ============================================================
  // tutorial — overlay rendering
  // ============================================================

  function tutorialOverlay() {
    if (tut.axisHighlight) drawTutAxisHL(tut.axisHighlight);
    if (tut.axisArrow) drawTutAxisArrow(tut.axisArrow);
    if (tut.staircase) drawTutStaircase(tut.staircase);
    for (var j = 0; j < tut.stepDots.length; j++) drawTutDot(tut.stepDots[j]);
    if (tut.showBDot && tut.bDotY !== null) drawTutBDot(tut.bDotY);
    for (var i = 0; i < tut.canvasTexts.length; i++) drawTutText(tut.canvasTexts[i]);
  }

  function drawTutAxisHL(axis) {
    var o = toScreen(0, 0);
    ctx.save();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.7;
    if (axis === 'y') {
      ctx.beginPath(); ctx.moveTo(o.sx, 0); ctx.lineTo(o.sx, height); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, o.sy); ctx.lineTo(width, o.sy); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTutAxisArrow(arrow) {
    var o = toScreen(0, 0);
    var p = arrow.progress;
    ctx.save();
    ctx.fillStyle = LINE_COLOR;
    var tx, ty, angle;
    if (arrow.axis === 'y') {
      tx = o.sx; ty = height - p * height; angle = -Math.PI / 2;
    } else {
      tx = p * width; ty = o.sy; angle = 0;
    }
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawTutText(item) {
    ctx.save();
    ctx.globalAlpha = item.opacity !== undefined ? item.opacity : 1;
    ctx.font = (item.bold ? 'bold ' : '') + (item.fontSize || 24) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var totalW = 0, widths = [];
    if (item.segments) {
      for (var i = 0; i < item.segments.length; i++) {
        var w = ctx.measureText(item.segments[i].text).width;
        widths.push(w); totalW += w;
      }
    } else {
      totalW = ctx.measureText(item.text || '').width;
    }

    if (item.bg !== false) {
      var pad = item.bgPad !== undefined ? item.bgPad : 5, fs = item.fontSize || 24;
      var bx = item.x - totalW / 2 - pad;
      var by = item.y - fs / 2 - pad;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      roundRect(ctx, bx, by, totalW + pad * 2, fs + pad * 2, 6);
      ctx.fill();
    }

    if (item.segments) {
      var cx = item.x - totalW / 2;
      ctx.textAlign = 'left';
      for (var j = 0; j < item.segments.length; j++) {
        ctx.fillStyle = item.segments[j].color || '#1e293b';
        ctx.fillText(item.segments[j].text, cx, item.y);
        cx += widths[j];
      }
    } else {
      ctx.fillStyle = item.color || '#1e293b';
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  function drawTutStaircase(sc) {
    var rise = sc.rise !== undefined ? sc.rise : sc.m;
    var run = sc.run !== undefined ? sc.run : 1;
    var m = run === 0 ? 0 : rise / run;
    var b = sc.b;
    var sx = sc.startX, ns = sc.numSteps;
    var totalSegs = ns * 2;
    var vis = sc.progress !== undefined ? Math.min(sc.progress, totalSegs) : totalSegs;
    var fadeFrac = 0.7;

    var maxSeg = Math.min(Math.ceil(vis), totalSegs);
    for (var i = 0; i < maxSeg; i++) {
      var si = Math.floor(i / 2);
      var x0 = sx + si * run, y0 = m * x0 + b;
      var segFrac = i < Math.floor(vis) ? 1 : (vis - Math.floor(vis));
      var labelAlpha = Math.min(1, segFrac / fadeFrac);

      if (i % 2 === 0) {
        drawTutDashed(x0, y0, x0 + run * segFrac, y0, COLOR_RUN);
        if (labelAlpha > 0) {
          ctx.save(); ctx.globalAlpha = labelAlpha;
          var ms = toScreen(x0 + run, y0);
          drawLabelWithBG('run = ' + fmtN(run), ms.sx + 6,
            ms.sy, 'left', 'middle', COLOR_RUN);
          ctx.restore();
        }
      } else {
        drawTutDashed(x0 + run, y0, x0 + run, y0 + rise * segFrac, COLOR_M);
        if (labelAlpha > 0) {
          ctx.save(); ctx.globalAlpha = labelAlpha;
          var mr = toScreen(x0 + run, y0 + rise / 2);
          drawLabelWithBG('rise = ' + fmtN(rise), mr.sx + 6, mr.sy, 'left', 'middle', COLOR_M);
          ctx.restore();
        }
      }
    }
  }

  function drawTutDashed(x1, y1, x2, y2, color) {
    var s1 = toScreen(x1, y1), s2 = toScreen(x2, y2);
    ctx.setLineDash([]);
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(s1.sx, s1.sy); ctx.lineTo(s2.sx, s2.sy); ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2.5; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(s1.sx, s1.sy); ctx.lineTo(s2.sx, s2.sy); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawTutDot(dot) {
    var s = toScreen(dot.x, dot.y);
    ctx.save();
    if (dot.opacity !== undefined) ctx.globalAlpha = dot.opacity;
    ctx.fillStyle = dot.color || COLOR_POINT;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, dot.r || 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawTutBDot(bVal) {
    var s = toScreen(0, bVal);
    ctx.fillStyle = COLOR_B;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.stroke();
    drawLabelWithBG('b = ' + fmtN(bVal), s.sx - 16, s.sy - 16, 'right', 'bottom', COLOR_B);

    if (tut.coordLabel && tut.coordLabel.opacity > 0) {
      ctx.save();
      ctx.globalAlpha = tut.coordLabel.opacity;
      ctx.strokeStyle = 'rgba(14,165,233,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.sx + 8, s.sy);
      ctx.lineTo(s.sx + 22, s.sy);
      ctx.stroke();
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#475569';
      ctx.fillText(tut.coordLabel.text, s.sx + 24, s.sy);
      ctx.restore();
    }
  }

  function fmtEquation(m, b) {
    var segs = [{ text: 'y = ', color: '#1e293b' }];
    segs.push({ text: fmtN(m), color: COLOR_M });
    segs.push({ text: 'x', color: '#1e293b' });
    if (b >= 0) { segs.push({ text: ' + ', color: '#1e293b' }); segs.push({ text: fmtN(b), color: COLOR_B }); }
    else { segs.push({ text: ' \u2013 ', color: '#1e293b' }); segs.push({ text: fmtN(Math.abs(b)), color: COLOR_B }); }
    return segs;
  }

  function resetTutorialViewport(range) {
    range = range || 12;
    viewXMin = -range; viewXMax = range;
    viewYMin = -range; viewYMax = range;
    enforceSquareGrid();
  }

  var CM = '<span style="color:' + COLOR_M + ';font-weight:700">';
  var CB = '<span style="color:' + COLOR_B + ';font-weight:700">';
  var CR = '<span style="color:' + COLOR_RUN + ';font-weight:700">';
  var CE = '</span>';
  var BR = '<br>';

  // ============================================================
  // tutorial — controller
  // ============================================================

  var tutorialController = {
    currentStepIndex: 0,
    steps: [],
    cancelHandles: [],

    start: function () {
      this.currentStepIndex = 0;
      this.executeCurrentStep();
    },
    next: function () {
      if (this.currentStepIndex >= this.steps.length - 1) return;
      this.cleanupCurrentStep();
      this.currentStepIndex++;
      this.executeCurrentStep();
    },
    back: function () {
      if (this.currentStepIndex <= 0) return;
      this.cleanupCurrentStep();
      this.currentStepIndex--;
      this.executeCurrentStep();
    },
    replay: function () {
      this.cleanupCurrentStep();
      this.executeCurrentStep();
    },
    exit: function () {
      this.cleanupCurrentStep();
      setMode('playground');
    },
    track: function (h) { this.cancelHandles.push(h); return h; },
    cancelAll: function () {
      for (var i = 0; i < this.cancelHandles.length; i++) this.cancelHandles[i].cancel();
      this.cancelHandles = [];
    },
    cleanupCurrentStep: function () {
      this.cancelAll();
      var step = this.steps[this.currentStepIndex];
      if (step && step.cleanup) step.cleanup(this.ctx());
      resetTutorialOverlays();
    },
    executeCurrentStep: function () {
      var step = this.steps[this.currentStepIndex];
      if (!step) return;
      updateTutorialPanel(step, this.currentStepIndex, this.steps.length);
      step.execute(this.ctx());
      draw();
    },
    ctx: function () {
      var self = this;
      return {
        track: function (h) { return self.track(h); },
        controls: document.getElementById('tutorial-controls'),
        draw: draw
      };
    }
  };

  // ============================================================
  // tutorial — slides
  // ============================================================

  var tutorialSteps = [
    // --- Slide 1: The Slope-Intercept Form ---
    {
      id: 'form',
      hideReplay: true,
      headline: 'The Slope-Intercept Form',
      bodyHTML: 'When you see a linear equation written like this:' +
        '<span class="formula-inline">y = ' + CM + 'm' + CE + 'x + ' + CB + 'b' + CE + '</span>' +
        'This is called <strong>slope-intercept form</strong>.' + BR +
        'It\u2019s a recipe for drawing a straight line.',
      execute: function (c) {
        resetTutorialViewport();
        tut.canvasTexts = [{
          segments: [
            { text: 'y', color: '#1e293b' }, { text: ' = ', color: '#1e293b' },
            { text: 'm', color: COLOR_M }, { text: 'x', color: '#1e293b' },
            { text: ' + ', color: '#1e293b' }, { text: 'b', color: COLOR_B }
          ],
          x: width / 2, y: height / 2, fontSize: 36, bold: true, opacity: 0
        }];
        c.track(tweenAnimate({
          duration: TIMING.slow,
          onUpdate: function (t) { tut.canvasTexts[0].opacity = t; c.draw(); }
        }));
      },
      cleanup: function () {}
    },

    // --- Slide 2: What is y? ---
    {
      id: 'what-y',
      headline: 'What is y?',
      formulaHTML: '<span class="tut-pulse" style="color:' + LINE_COLOR + '">y</span> = ' +
        '<span style="color:' + COLOR_M + '">m</span>x + ' +
        '<span style="color:' + COLOR_B + '">b</span>',
      bodyHTML: '<strong style="color:' + LINE_COLOR + '">y</strong> is the output \u2014 where you end up <strong>vertically</strong>.' + BR + BR +
        'Every point on the graph has a <strong style="color:' + LINE_COLOR + '">y</strong> value.' + BR +
        'It\u2019s the up-down position at that spot.' + BR + BR +
        'The <strong style="color:' + LINE_COLOR + '">y</strong>-axis (highlighted in blue) is where we read those heights.',
      execute: function (c) {
        resetTutorialViewport();
        tut.allowPanZoom = false;
        tut.axisHighlight = 'y';
        tut.axisArrow = { axis: 'y', progress: 0 };
        c.draw();
        c.track(tweenAnimate({
          duration: 2000,
          easing: function (t) { return t; },
          onUpdate: function (t) { tut.axisArrow.progress = t; c.draw(); },
          onDone: function () {
            tut.axisArrow = null;
            var o = toScreen(0, 0);
            tut.canvasTexts = [{ text: 'y', x: o.sx + 20, y: 24, fontSize: 22, bold: true, color: LINE_COLOR }];
            c.draw();
          }
        }));
      },
      cleanup: function () {}
    },

    // --- Slide 3: What is x? ---
    {
      id: 'what-x',
      headline: 'What is x?',
      formulaHTML: 'y = ' +
        '<span style="color:' + COLOR_M + '">m</span>' +
        '<span class="tut-pulse" style="color:' + LINE_COLOR + '">x</span> + ' +
        '<span style="color:' + COLOR_B + '">b</span>',
      bodyHTML: '<strong style="color:' + LINE_COLOR + '">x</strong> is the input \u2014 the value <strong>you</strong> choose.' + BR + BR +
        'Every point on the graph has an <strong style="color:' + LINE_COLOR + '">x</strong> value.' + BR +
        'It\u2019s the left-right position at that spot.' + BR + BR +
        'The <strong style="color:' + LINE_COLOR + '">x</strong>-axis (highlighted in blue) is where we read those positions.',
      execute: function (c) {
        resetTutorialViewport();
        tut.allowPanZoom = false;
        tut.axisHighlight = 'x';
        tut.axisArrow = { axis: 'x', progress: 0 };
        c.draw();
        c.track(tweenAnimate({
          duration: 2000,
          easing: function (t) { return t; },
          onUpdate: function (t) { tut.axisArrow.progress = t; c.draw(); },
          onDone: function () {
            tut.axisArrow = null;
            var o = toScreen(0, 0);
            tut.canvasTexts = [{ text: 'x', x: width - 24, y: o.sy - 20, fontSize: 22, bold: true, color: LINE_COLOR }];
            c.draw();
          }
        }));
      },
      cleanup: function () {}
    },

    // --- Slide 4: What is b? ---
    {
      id: 'what-b',
      headline: 'What is b (the y-intercept)?',
      formulaHTML: 'y = <span style="color:' + COLOR_M + '">m</span>x + ' +
        '<span class="tut-pulse" style="color:' + COLOR_B + '">b</span>',
      bodyHTML: CB + 'b' + CE + ' is where the line crosses the <strong>y-axis</strong> (when x&nbsp;=&nbsp;0).' + BR + BR +
        'If ' + CB + 'b' + CE + '&nbsp;=&nbsp;3, the line crosses at y&nbsp;=&nbsp;3.' + BR +
        'If ' + CB + 'b' + CE + '&nbsp;=&nbsp;\u20132, it crosses at y&nbsp;=&nbsp;\u20132.',
      execute: function (c) {
        resetTutorialViewport();
        tut.allowPanZoom = false;
        tut.showBDot = true;
        tut.bDotY = 3;
        c.draw();

        var coordTimer = null, coordFadeHandle = null;

        function showCoords() {
          tut.coordLabel = { text: '(0, ' + fmtN(Math.round(tut.bDotY)) + ')', opacity: 0 };
          coordFadeHandle = c.track(tweenAnimate({
            duration: TIMING.fast,
            onUpdate: function (t) { tut.coordLabel.opacity = t; c.draw(); }
          }));
        }

        function hideCoords() {
          if (coordTimer) { clearTimeout(coordTimer); coordTimer = null; }
          if (coordFadeHandle) { coordFadeHandle.cancel(); coordFadeHandle = null; }
          tut.coordLabel = null;
        }

        function scheduleCoords() {
          hideCoords();
          coordTimer = setTimeout(showCoords, 400);
        }

        c.track(tweenSequence([
          function (done) { return tweenDelay(TIMING.beat, done); },
          function (done) {
            return tweenAnimate({ duration: TIMING.slow, onUpdate: function (t) {
              tut.bDotY = 3 + (-2 - 3) * t; c.draw();
            }, onDone: done });
          },
          function (done) { return tweenDelay(TIMING.beat, done); },
          function (done) {
            return tweenAnimate({ duration: TIMING.slow, onUpdate: function (t) {
              tut.bDotY = -2 + (5 - (-2)) * t; c.draw();
            }, onDone: done });
          }
        ], function () {
          var container = c.controls;
          container.innerHTML = '';
          var hint = document.createElement('p');
          hint.style.cssText = 'font-size:0.85rem;color:#64748b;margin:0 0 0.5rem';
          hint.textContent = 'Try sliding b up and down:';
          container.appendChild(hint);

          var row = document.createElement('div');
          row.className = 'slider-row';
          var lbl = document.createElement('label');
          lbl.textContent = 'b';
          lbl.style.cssText = 'flex:0 0 24px;font-weight:700;color:' + COLOR_B;
          var sl = document.createElement('input');
          sl.type = 'range';
          sl.min = String(Math.ceil(viewYMin + 1));
          sl.max = String(Math.floor(viewYMax - 1));
          sl.step = '1'; sl.value = '5';
          sl.style.flex = '1';
          var vSpan = document.createElement('span');
          vSpan.className = 'slider-value'; vSpan.textContent = '5';

          sl.addEventListener('input', function () {
            tut.bDotY = parseInt(sl.value, 10);
            vSpan.textContent = sl.value;
            hideCoords();
            c.draw();
            scheduleCoords();
          });

          row.appendChild(lbl); row.appendChild(sl); row.appendChild(vSpan);
          container.appendChild(row);
          scheduleCoords();
        }));
      },
      cleanup: function (c) { c.controls.innerHTML = ''; }
    },

    // --- Slide 5: What is m? (the slope) ---
    {
      id: 'what-m',
      headline: 'What is m (the slope)?',
      formulaHTML: 'y = <span class="tut-pulse" style="color:' + COLOR_M + '">m</span>x + ' +
        '<span style="color:' + COLOR_B + '">b</span>',
      bodyHTML: CM + 'm' + CE + ' is the <strong>slope</strong> \u2014 a ratio that describes steepness.' + BR +
        'It tells you: for every 1 step right, move ' + CM + 'm' + CE + ' steps up (or down).' + BR + BR +
        '<span class="formula-inline">slope = rise / run</span>' +
        CM + 'm' + CE + '&nbsp;=&nbsp;2 means rise&nbsp;2, run&nbsp;1.' + BR +
        CM + 'm' + CE + '&nbsp;=&nbsp;\u20131 means drop&nbsp;1, run&nbsp;1.' + BR + BR +
        'Use the slider to change the slope and watch the staircase.',
      execute: function (c) {
        resetTutorialViewport(8);
        tut.allowPanZoom = false;
        var curM = 2;
        state._m = curM; state._b = 1; state._r2 = 1;
        tut.showLine = true;
        var staircaseHandle = null;

        function animSC() {
          if (staircaseHandle) staircaseHandle.cancel();
          var ns = Math.max(3, Math.floor(viewXMax) - Math.ceil(viewXMin));
          var sx = Math.ceil(viewXMin);
          tut.staircase = { m: curM, b: 1, startX: sx, numSteps: ns, progress: 0 };
          c.draw();
          staircaseHandle = c.track(tweenAnimate({
            duration: TIMING.stairStep * ns * 2,
            easing: function (t) { return t; },
            onUpdate: function (t) { tut.staircase.progress = t * ns * 2; c.draw(); }
          }));
        }

        animSC();

        var container = c.controls;
        container.innerHTML = '';
        var row = document.createElement('div');
        row.className = 'slider-row';
        var lbl = document.createElement('label');
        lbl.textContent = 'Slope (m)';
        lbl.style.cssText = 'flex:0 0 80px;font-weight:700;color:' + COLOR_M;
        var sl = document.createElement('input');
        sl.type = 'range'; sl.min = '-5'; sl.max = '5'; sl.step = '1'; sl.value = '2';
        sl.style.flex = '1';
        var vSpan = document.createElement('span');
        vSpan.className = 'slider-value'; vSpan.textContent = '2';

        sl.addEventListener('input', function () {
          curM = parseInt(sl.value, 10);
          vSpan.textContent = curM;
          state._m = curM; state._r2 = 1;
          animSC();
        });

        row.appendChild(lbl); row.appendChild(sl); row.appendChild(vSpan);
        container.appendChild(row);
      },
      cleanup: function (c) { c.controls.innerHTML = ''; }
    },

    // --- Slide 6: Putting It Together ---
    {
      id: 'together',
      headline: 'Putting It Together',
      formulaHTML: 'y = <span style="color:' + COLOR_M + '">m</span>x + ' +
        '<span style="color:' + COLOR_B + '">b</span>',
      bodyHTML: 'Start at ' + CB + 'b' + CE + ' on the y-axis, then use the slope to step along the line.' + BR + BR +
        'Each step: go right by ' + CR + 'run' + CE + ', then up (or down) by ' + CM + 'rise' + CE + '.' + BR +
        '<span class="formula-inline">slope = ' + CM + 'rise' + CE + ' / ' + CR + 'run' + CE + '</span>' +
        'Adjust the sliders to see how rise and run build the line.',
      execute: function (c) {
        resetTutorialViewport(8);
        tut.allowPanZoom = false;
        var curRise = 2, curRun = 1;
        var b = 1;
        state._m = curRise / curRun; state._b = b; state._r2 = 1;
        tut.showBDot = true; tut.bDotY = b;
        tut.showLine = true;
        var numSteps = 5;
        var staircaseHandle = null;
        var zoomHandle = null;

        function targetRange() {
          var stepsNeeded = 3;
          var xNeeded = stepsNeeded * curRun + 2;
          var yNeeded = Math.abs(stepsNeeded * curRise) + Math.abs(b) + 2;
          return Math.max(8, Math.ceil(Math.max(xNeeded, yNeeded) * 1.2));
        }

        function smoothZoomTo(range, then) {
          if (zoomHandle) zoomHandle.cancel();
          var fromXMin = viewXMin, fromXMax = viewXMax;
          var fromYMin = viewYMin, fromYMax = viewYMax;
          var toXMin = -range, toXMax = range;
          var toYMin = -range, toYMax = range;
          if (Math.abs(fromXMin - toXMin) < 0.5) { if (then) then(); return; }
          zoomHandle = c.track(tweenAnimate({
            duration: 400,
            onUpdate: function (t) {
              viewXMin = fromXMin + (toXMin - fromXMin) * t;
              viewXMax = fromXMax + (toXMax - fromXMax) * t;
              viewYMin = fromYMin + (toYMin - fromYMin) * t;
              viewYMax = fromYMax + (toYMax - fromYMax) * t;
              enforceSquareGrid();
              c.draw();
            },
            onDone: function () { zoomHandle = null; if (then) then(); }
          }));
        }

        function updateEquation() {
          var m = curRun === 0 ? 0 : curRise / curRun;
          state._m = m; state._r2 = 1;
          tut.canvasTexts = [{
            segments: fmtEquation(m, b),
            x: width / 2, y: 30, fontSize: 24, bold: true, opacity: 1
          }];
        }

        function animSC() {
          if (staircaseHandle) staircaseHandle.cancel();
          updateEquation();
          var m = curRun === 0 ? 0 : curRise / curRun;
          var range = targetRange();

          smoothZoomTo(range, function () {
            tut.staircase = { rise: curRise, run: curRun, b: b, startX: 0, numSteps: numSteps, progress: 0 };
            tut.stepDots = [{ x: 0, y: b, color: COLOR_B }];
            c.draw();
            staircaseHandle = c.track(tweenAnimate({
              duration: TIMING.stairStep * numSteps * 2,
              easing: function (t) { return t; },
              onUpdate: function (t) {
                tut.staircase.progress = t * numSteps * 2;
                var fullSteps = Math.floor(tut.staircase.progress / 2);
                while (tut.stepDots.length - 1 < fullSteps && tut.stepDots.length - 1 < numSteps) {
                  var idx = tut.stepDots.length - 1;
                  tut.stepDots.push({ x: (idx + 1) * curRun, y: m * ((idx + 1) * curRun) + b, color: COLOR_POINT });
                }
                c.draw();
              }
            }));
          });
        }

        animSC();

        var container = c.controls;
        container.innerHTML = '';

        function makeSliderRow(label, color, min, max, val, onChange) {
          var row = document.createElement('div');
          row.className = 'slider-row';
          var lb = document.createElement('label');
          lb.textContent = label;
          lb.style.cssText = 'flex:0 0 60px;font-weight:700;color:' + color;
          var sl = document.createElement('input');
          sl.type = 'range'; sl.min = String(min); sl.max = String(max);
          sl.step = '1'; sl.value = String(val); sl.style.flex = '1';
          var sp = document.createElement('span');
          sp.className = 'slider-value'; sp.textContent = String(val);
          sl.addEventListener('input', function () {
            sp.textContent = sl.value;
            onChange(parseInt(sl.value, 10));
          });
          row.appendChild(lb); row.appendChild(sl); row.appendChild(sp);
          return row;
        }

        container.appendChild(makeSliderRow('Rise', COLOR_M, -10, 10, curRise, function (v) {
          curRise = v; animSC();
        }));
        container.appendChild(makeSliderRow('Run', COLOR_RUN, 1, 10, curRun, function (v) {
          curRun = v; animSC();
        }));

        var slopeDisplay = document.createElement('div');
        slopeDisplay.style.cssText = 'font-size:0.85rem;color:#64748b;margin-top:0.35rem;text-align:center';
        function updateSlopeDisplay() {
          slopeDisplay.textContent = 'slope = ' + curRise + ' / ' + curRun + ' = ' + fmtN(curRun === 0 ? 0 : curRise / curRun);
        }
        updateSlopeDisplay();
        container.appendChild(slopeDisplay);

        var origAnimSC = animSC;
        animSC = function () { origAnimSC(); updateSlopeDisplay(); };
      },
      cleanup: function (c) { c.controls.innerHTML = ''; }
    },

    // --- Slide 7: Simple Example y = 2x + 1 ---
    {
      id: 'example',
      headline: 'Simple Example: y = 2x + 1',
      formulaHTML: 'y = <span style="color:' + COLOR_M + '">2</span>x + <span style="color:' + COLOR_B + '">1</span>',
      bodyHTML: 'Let\u2019s solve <strong>y = ' + CM + '2' + CE + 'x + ' + CB + '1' + CE + '</strong> step by step.' + BR + BR +
        'When x = 0: &nbsp;y = ' + CM + '2' + CE + '(0) + ' + CB + '1' + CE + ' = <strong>1</strong>' + BR +
        'The point (0, 1) is the y-intercept.' + BR + BR +
        'When x = 1: &nbsp;y = ' + CM + '2' + CE + '(1) + ' + CB + '1' + CE + ' = <strong>3</strong>' + BR +
        'So the next point is (1, 3).' + BR + BR +
        'When x = 2: &nbsp;y = ' + CM + '2' + CE + '(2) + ' + CB + '1' + CE + ' = <strong>5</strong>' + BR +
        'Another point: (2, 5).' + BR + BR +
        'Connect the dots \u2014 there\u2019s your line!',
      execute: function (c) {
        resetTutorialViewport(8);
        var m = 2, b = 1;
        state._m = m; state._b = b; state._r2 = 1;
        var pts = [
          { x: 0, y: 1, label: '(0, 1)' },
          { x: 1, y: 3, label: '(1, 3)' },
          { x: 2, y: 5, label: '(2, 5)' }
        ];
        c.draw();

        var seqFns = [];
        seqFns.push(function (done) { return tweenDelay(TIMING.beat, done); });
        for (var i = 0; i < pts.length; i++) {
          (function (pt) {
            seqFns.push(function (done) {
              tut.stepDots.push({ x: pt.x, y: pt.y, color: pt.x === 0 ? COLOR_B : COLOR_POINT });
              var ps = toScreen(pt.x, pt.y);
              tut.canvasTexts.push({
                text: pt.label, x: ps.sx + 24,
                y: ps.sy - 18,
                fontSize: 13, bold: true, color: '#475569', bg: false
              });
              c.draw();
              return tweenDelay(TIMING.slow, done);
            });
          })(pts[i]);
        }
        seqFns.push(function (done) {
          tut.showLine = true;
          tut.showBDot = true; tut.bDotY = b;
          c.draw();
          return tweenDelay(0, done);
        });

        c.track(tweenSequence(seqFns));
      },
      cleanup: function () {}
    },

    // --- Slide 8: The Big Picture ---
    {
      id: 'big-picture',
      headline: 'The Big Picture',
      bodyHTML: 'Slope-intercept form answers two questions:' + BR + BR +
        'Where does the line cross the y-axis? That\u2019s ' + CB + 'b' + CE + '.' + BR +
        'How steep is the line? That\u2019s ' + CM + 'm' + CE + '.' + BR + BR +
        'A line is just: start somewhere, then repeat the same step over and over.',
      execute: function (c) {
        resetTutorialViewport();
        var m = 2, b = 1;
        var formulaDiv = null;

        function showEquation(em, eb) {
          state._m = em; state._b = eb; state._r2 = 1;
          tut.showLine = true;
          tut.showBDot = true; tut.bDotY = eb;
          var sx = Math.ceil(viewXMin), ns = Math.floor(viewXMax) - sx;
          tut.staircase = { m: em, b: eb, startX: sx, numSteps: ns, progress: ns * 2 };
          tut.canvasTexts = [{
            segments: fmtEquation(em, eb),
            x: width / 2, y: 30, fontSize: 24, bold: true, opacity: 1
          }];
          tut.stepDots = [];
          c.draw();
          if (formulaDiv) {
            var bSign = eb >= 0 ? ' + ' : ' \u2013 ';
            formulaDiv.innerHTML =
              '<span style="font-weight:700">y = ' +
              '<span style="color:' + COLOR_M + '">' + fmtN(em) + '</span>x' +
              bSign + '<span style="color:' + COLOR_B + '">' + fmtN(Math.abs(eb)) + '</span></span>' +
              '<br><span style="font-size:0.8rem;color:#64748b">slope (' +
              '<span style="color:' + COLOR_M + '">m</span>) = ' + fmtN(em) +
              ', &nbsp;intercept (<span style="color:' + COLOR_B + '">b</span>) = ' + fmtN(eb) + '</span>';
          }
        }

        showEquation(m, b);

        var container = c.controls;
        container.innerHTML = '';
        var btn = document.createElement('button');
        btn.textContent = 'Plot a Random Line';
        btn.className = 'btn btn-accent';
        btn.addEventListener('click', function () {
          var pad = 2;
          var yLo = Math.ceil(viewYMin + pad), yHi = Math.floor(viewYMax - pad);
          var rm = randInt(-5, 5);
          var rb = randInt(Math.max(yLo, -10), Math.min(yHi, 10));
          showEquation(rm, rb);
        });
        container.appendChild(btn);
        formulaDiv = document.createElement('div');
        formulaDiv.style.cssText = 'text-align:center;margin-top:0.75rem;line-height:1.6';
        container.appendChild(formulaDiv);
        showEquation(m, b);
      },
      cleanup: function (c) { c.controls.innerHTML = ''; }
    },

    // --- Slide 9: Now Try It Yourself ---
    {
      id: 'try-it',
      headline: 'Now Try It Yourself!',
      bodyHTML: 'You\u2019ve got it! Now explore on your own.' + BR + BR +
        'Drag the points. Move the sliders. Edit the table.' + BR +
        'See how changing ' + CM + 'm' + CE + ' and ' + CB + 'b' + CE + ' changes the line.',
      execute: function (c) {
        resetTutorialViewport();
        tut.allowPanZoom = false;

        function runCycle() {
          var rm = randInt(-3, 3) || 1;
          var rb = randInt(-5, 5);
          state._m = rm; state._b = rb; state._r2 = 1;
          tut.stepDots = [];
          tut.showLine = false;
          tut.canvasTexts = [];
          c.draw();

          var dots = [];
          var numDots = randInt(3, 4);
          for (var i = 0; i < numDots; i++) {
            var dx = randInt(-4, 5);
            dots.push({ x: dx, y: rm * dx + rb });
          }

          var seqFns = [];
          for (var j = 0; j < dots.length; j++) {
            (function (d) {
              seqFns.push(function (done) {
                tut.stepDots.push({ x: d.x, y: d.y, color: COLOR_POINT });
                c.draw();
                return tweenDelay(200, done);
              });
            })(dots[j]);
          }
          seqFns.push(function (done) {
            tut.showLine = true;
            tut.canvasTexts = [{
              segments: fmtEquation(rm, rb),
              x: width / 2, y: 30, fontSize: 22, bold: true, opacity: 0
            }];
            c.draw();
            return tweenAnimate({
              duration: 600,
              onUpdate: function (t) { tut.canvasTexts[0].opacity = t; c.draw(); },
              onDone: done
            });
          });
          seqFns.push(function (done) { return tweenDelay(1500, done); });
          seqFns.push(function (done) {
            return tweenAnimate({
              duration: 500,
              onUpdate: function (t) {
                tut.lineOpacity = 1 - t;
                for (var k = 0; k < tut.stepDots.length; k++) tut.stepDots[k].opacity = 1 - t;
                if (tut.canvasTexts[0]) tut.canvasTexts[0].opacity = 1 - t;
                c.draw();
              },
              onDone: function () { tut.lineOpacity = null; done(); }
            });
          });

          c.track(tweenSequence(seqFns, function () { runCycle(); }));
        }

        runCycle();

        var container = c.controls;
        container.innerHTML = '';
        var btn = document.createElement('button');
        btn.textContent = 'Enter Playground';
        btn.className = 'btn-playground-enter';
        btn.addEventListener('click', function () { tutorialController.exit(); });
        container.appendChild(btn);
      },
      cleanup: function (c) { c.controls.innerHTML = ''; }
    }
  ];

  // ============================================================
  // tutorial — panel UI & mode switching
  // ============================================================

  function updateTutorialPanel(step, index, total) {
    document.getElementById('tutorial-formula').innerHTML = step.formulaHTML || '';
    document.getElementById('tutorial-headline').textContent = step.headline;
    var bodyEl = document.getElementById('tutorial-body');
    if (step.bodyHTML) bodyEl.innerHTML = step.bodyHTML;
    else bodyEl.textContent = step.body || '';
    document.getElementById('tutorial-progress').textContent = (index + 1) + ' / ' + total;
    document.getElementById('tutorial-controls').innerHTML = '';

    document.getElementById('tutorial-back').style.display = index === 0 ? 'none' : '';
    document.getElementById('tutorial-next').style.display = index === total - 1 ? 'none' : '';
    document.getElementById('tutorial-replay').style.display = step.hideReplay ? 'none' : '';
  }

  var currentMode = 'playground';

  function setMode(mode) {
    currentMode = mode;
    var cp = document.querySelector('.controls-panel');
    var tp = document.getElementById('tutorial-panel');
    var sub = document.querySelector('.subtitle');

    if (mode === 'tutorial') {
      cp.style.display = 'none';
      tp.style.display = '';
      sub.style.display = 'none';
      tutorialActive = true;
      state.showTriangle = false;
      state.showSteps = false;
      viewXMin = -12; viewXMax = 12; viewYMin = -12; viewYMax = 12;
      enforceSquareGrid();
      tutorialController.start();
    } else {
      tp.style.display = 'none';
      cp.style.display = '';
      sub.style.display = '';
      tutorialActive = false;
      state.showTriangle = toggleTriangle.checked;
      state.showSteps = toggleSteps.checked;
      state.reset();
      draw();
    }
  }

  function initTutorial() {
    tutorialController.steps = tutorialSteps;

    document.getElementById('btn-start-tutorial').addEventListener('click', function () {
      setMode('tutorial');
    });
    document.getElementById('tutorial-close').addEventListener('click', function () {
      tutorialController.exit();
    });
    document.getElementById('tutorial-next').addEventListener('click', function () {
      tutorialController.next();
    });
    document.getElementById('tutorial-back').addEventListener('click', function () {
      tutorialController.back();
    });
    document.getElementById('tutorial-replay').addEventListener('click', function () {
      tutorialController.replay();
    });
  }

  // ============================================================
  // init
  // ============================================================

  document.addEventListener('DOMContentLoaded', function () {
    initGraph(document.getElementById('graph'));
    initControls();
    initTutorial();
  });

})();
