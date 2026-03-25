import { linearRegression, round } from './math-utils.js';

const DEFAULT_POINTS = [
  { x: -3, y: -13 },
  { x:  2, y:   2 },
  { x:  7, y:  17 },
  { x: 12, y:  32 },
];

class AppState {
  constructor() {
    this._m = 3;
    this._b = -4;
    this._points = DEFAULT_POINTS.map(p => ({ ...p }));
    this._listeners = [];
    this._updating = false;
  }

  get m() { return this._m; }
  get b() { return this._b; }
  get points() { return this._points; }

  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify(source) {
    if (this._updating) return;
    this._updating = true;
    for (const fn of this._listeners) fn(source);
    this._updating = false;
  }

  /** Set m and b directly (from sliders, equation input, or drag). Recomputes table y-values. */
  setLine(m, b, source = 'unknown') {
    this._m = round(m, 4);
    this._b = round(b, 4);
    for (const p of this._points) {
      p.y = round(this._m * p.x + this._b, 4);
    }
    this._notify(source);
  }

  /** Update points from table edits. Runs regression to derive m and b. */
  setPoints(points, source = 'table') {
    this._points = points.map(p => ({ x: p.x, y: p.y }));
    const reg = linearRegression(this._points);
    if (reg) {
      this._m = reg.m;
      this._b = reg.b;
      this._r2 = reg.r2;
    }
    this._notify(source);
  }

  get r2() { return this._r2 ?? 1; }

  addPoint(x) {
    const y = round(this._m * x + this._b, 4);
    this._points.push({ x, y });
    this._notify('table');
  }

  removePoint(index) {
    if (this._points.length <= 2) return;
    this._points.splice(index, 1);
    const reg = linearRegression(this._points);
    if (reg) {
      this._m = reg.m;
      this._b = reg.b;
      this._r2 = reg.r2;
    }
    this._notify('table');
  }

  reset() {
    this._points = DEFAULT_POINTS.map(p => ({ ...p }));
    this._m = 3;
    this._b = -4;
    this._r2 = 1;
    this._notify('reset');
  }
}

export const state = new AppState();
