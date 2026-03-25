import { initGraph } from './graph.js';
import { initControls } from './controls.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('graph');
  initGraph(canvas);
  initControls();
});
