/*
 * Corne heatmap viewer for the session files written by log.sh.
 *
 * Key size and rotation math adapted from keymap-editor (app/src/key-units.js)
 * https://github.com/nickcoutsos/keymap-editor
 * MIT License, Copyright (c) 2021 Nick Coutsos. Full license text in style.css.
 *
 * Corne physical layout from ZMK (app/dts/layouts/foostan/corne/6column.dtsi)
 * https://github.com/zmkfirmware/zmk, MIT License, Copyright (c) The ZMK Contributors.
 */

// [w, h, x, y, rotation, rx, ry], ZMK units: 100 = one key, rotation in centi-degrees.
// Index = ZMK key position, the number log.sh counts.
const LAYOUT = [
  [100, 100, 0, 37, 0, 0, 0], [100, 100, 100, 37, 0, 0, 0], [100, 100, 200, 12, 0, 0, 0],
  [100, 100, 300, 0, 0, 0, 0], [100, 100, 400, 12, 0, 0, 0], [100, 100, 500, 24, 0, 0, 0],
  [100, 100, 800, 24, 0, 0, 0], [100, 100, 900, 12, 0, 0, 0], [100, 100, 1000, 0, 0, 0, 0],
  [100, 100, 1100, 12, 0, 0, 0], [100, 100, 1200, 37, 0, 0, 0], [100, 100, 1300, 37, 0, 0, 0],
  [100, 100, 0, 137, 0, 0, 0], [100, 100, 100, 137, 0, 0, 0], [100, 100, 200, 112, 0, 0, 0],
  [100, 100, 300, 100, 0, 0, 0], [100, 100, 400, 112, 0, 0, 0], [100, 100, 500, 124, 0, 0, 0],
  [100, 100, 800, 124, 0, 0, 0], [100, 100, 900, 112, 0, 0, 0], [100, 100, 1000, 100, 0, 0, 0],
  [100, 100, 1100, 112, 0, 0, 0], [100, 100, 1200, 137, 0, 0, 0], [100, 100, 1300, 137, 0, 0, 0],
  [100, 100, 0, 237, 0, 0, 0], [100, 100, 100, 237, 0, 0, 0], [100, 100, 200, 212, 0, 0, 0],
  [100, 100, 300, 200, 0, 0, 0], [100, 100, 400, 212, 0, 0, 0], [100, 100, 500, 224, 0, 0, 0],
  [100, 100, 800, 224, 0, 0, 0], [100, 100, 900, 212, 0, 0, 0], [100, 100, 1000, 200, 0, 0, 0],
  [100, 100, 1100, 212, 0, 0, 0], [100, 100, 1200, 237, 0, 0, 0], [100, 100, 1300, 237, 0, 0, 0],
  [100, 100, 350, 312, 0, 0, 0], [100, 100, 450, 312, 1200, 450, 412],
  [100, 150, 548, 283, 2400, 548, 433], [100, 150, 752, 283, -2400, 852, 433],
  [100, 100, 850, 312, -1200, 950, 412], [100, 100, 950, 312, 0, 0, 0],
];

// keymap-editor's key units
const SIZE = 65;
const PADDING = 5;
const UNIT = SIZE + PADDING;
const BASE_LAYERS = 4;
const GRADIENT_OPACITY = 200; // of 255

// keymap-editor draws the halves one key further apart than ZMK's layout
const RIGHT_HALF_SHIFT = 100;
const RIGHT_HALF_FROM_X = 700;

const keys = LAYOUT.map(([w, h, x, y, r, rx, ry], position) => {
  if (x >= RIGHT_HALF_FROM_X) {
    x += RIGHT_HALF_SHIFT;
    if (r) rx += RIGHT_HALF_SHIFT;
  }
  const u = w / 100, v = h / 100;
  const left = (x / 100) * UNIT;
  const top = (y / 100) * UNIT;
  const width = u * SIZE + PADDING * (u - 1);
  const height = v * SIZE + PADDING * (v - 1);
  const angle = r / 100;
  // Rotation origin relative to the key's top-left corner
  const ox = r ? (rx / 100) * UNIT - left : 0;
  const oy = r ? (ry / 100) * UNIT - top : 0;
  const rotate = (px, py) => {
    const a = (angle * Math.PI) / 180;
    const dx = px - ox, dy = py - oy;
    return [left + ox + dx * Math.cos(a) - dy * Math.sin(a), top + oy + dy * Math.cos(a) + dx * Math.sin(a)];
  };
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([px, py]) => rotate(px, py));
  return { position, left, top, width, height, angle, ox, oy, center: rotate(width / 2, height / 2), corners };
});

const allCorners = keys.flatMap((k) => k.corners);
const minX = Math.min(...allCorners.map((c) => c[0]));
const minY = Math.min(...allCorners.map((c) => c[1]));
const boardWidth = Math.ceil(Math.max(...allCorners.map((c) => c[0])) - minX);
const boardHeight = Math.ceil(Math.max(...allCorners.map((c) => c[1])) - minY);

const state = {
  files: new Map(), // name -> { counts: { layer: { position: n } }, total }
  view: 0, // a layer number or 'overall'
  mode: 'gradient',
  keymap: null, // { name, layers: [{ name, labels }], warnings }
};

const $ = (id) => document.getElementById(id);
const board = $('board');
const canvas = $('heat');
const tooltip = $('tooltip');

// Cold to hot, shared by both modes and the legend
const PALETTE_STOPS = [
  [0, '#3b4cc0'],
  [0.35, '#2fb5d5'],
  [0.55, '#5fd35f'],
  [0.75, '#f5d33c'],
  [1, '#d7301f'],
];

// Sampled into 256 colors
const palette = (() => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [at, c] of PALETTE_STOPS) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
})();

function color(t) {
  const i = Math.max(0, Math.min(255, Math.round(t * 255))) * 4;
  return `rgb(${palette[i]}, ${palette[i + 1]}, ${palette[i + 2]})`;
}

function countsForView() {
  const out = new Array(LAYOUT.length).fill(0);
  for (const { counts } of state.files.values()) {
    for (const [layer, positions] of Object.entries(counts)) {
      if (state.view !== 'overall' && Number(layer) !== state.view) continue;
      for (const [pos, n] of Object.entries(positions)) {
        if (out[pos] !== undefined) out[pos] += n;
      }
    }
  }
  return out;
}

// Log scale, so a few very busy keys don't wash everything else out
function scale(counts) {
  const max = Math.max(0, ...counts);
  return (n) => (n > 0 && max > 0 ? Math.log1p(n) / Math.log1p(max) : 0);
}

function buildKeys() {
  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
  for (const k of keys) {
    const el = document.createElement('div');
    el.className = 'key';
    el.dataset.position = k.position;
    Object.assign(el.style, {
      left: `${k.left - minX}px`,
      top: `${k.top - minY}px`,
      width: `${k.width}px`,
      height: `${k.height}px`,
      transformOrigin: `${k.ox}px ${k.oy}px`,
      transform: `rotate(${k.angle}deg)`,
    });
    $('keys').append(el);
  }
}

function drawGradient(counts) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = boardWidth * ratio;
  canvas.height = boardHeight * ratio;
  canvas.style.width = `${boardWidth}px`;
  canvas.style.height = `${boardHeight}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  // Soft blobs centered on each key, alpha by intensity, then colored by the
  // summed alpha. Each blob stays about the size of its key so neighbors only
  // just touch, and squaring the log scale lets light keys fade out instead of
  // the whole board turning yellow.
  const t = scale(counts);
  for (const k of keys) {
    const v = t(counts[k.position]) ** 2;
    if (!v) continue;
    // Hot keys glow strongest at the edge, so shrink them to keep them on their key
    const radius = UNIT * (0.8 - 0.15 * v);
    const [cx, cy] = [k.center[0] - minX, k.center[1] - minY];
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(0, 0, 0, ${v})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (!a) continue;
    const j = a * 4;
    px[i] = palette[j];
    px[i + 1] = palette[j + 1];
    px[i + 2] = palette[j + 2];
    // Semi-transparent, so the keys stay readable underneath
    px[i + 3] = Math.min(GRADIENT_OPACITY, a * 2);
  }
  ctx.putImageData(img, 0, 0);
}

function render() {
  const counts = countsForView();
  const t = scale(counts);

  board.className = state.mode;
  canvas.hidden = state.mode !== 'gradient';
  if (state.mode === 'gradient') drawGradient(counts);

  for (const el of $('keys').children) {
    const n = counts[el.dataset.position];
    el.dataset.count = n;
    el.classList.toggle('zero', n === 0);
    // Keys mode: one solid color per key; a tiny floor keeps rare keys visible
    el.style.backgroundColor = state.mode === 'keys' && n > 0 ? color(Math.max(t(n), 0.04)) : '';
    renderLabel(el, labelsForView()?.[el.dataset.position]);
  }

  const max = Math.max(0, ...counts);
  $('legend-max').textContent = `${max.toLocaleString()} ${max === 1 ? 'press' : 'presses'}`;

  renderTabs();
  renderFiles();
  renderKeymap();
  fit();
}

function layerCount() {
  let max = Math.max(BASE_LAYERS, state.keymap?.layers.length ?? 0) - 1;
  for (const { counts } of state.files.values()) {
    for (const layer of Object.keys(counts)) max = Math.max(max, Number(layer));
  }
  return max + 1;
}

function renderTabs() {
  const views = [...Array.from({ length: layerCount() }, (_, i) => i), 'overall'];
  $('tabs').replaceChildren(
    ...views.map((view) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      const name = state.keymap?.layers[view]?.name;
      b.textContent = view === 'overall' ? 'Overall' : name ? `${view} ${name}` : `Layer ${view}`;
      b.setAttribute('aria-selected', String(view === state.view));
      b.addEventListener('click', () => {
        state.view = view;
        render();
      });
      if (view === 'overall') li.className = 'overall';
      li.append(b);
      return li;
    })
  );
}

function renderFiles() {
  $('files').replaceChildren(
    ...[...state.files].map(([name, { total }]) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'name';
      label.textContent = name;
      const sum = document.createElement('span');
      sum.className = 'total';
      sum.textContent = `${total.toLocaleString()} presses`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${name}`);
      remove.addEventListener('click', () => {
        state.files.delete(name);
        render();
      });
      li.append(label, sum, remove);
      return li;
    })
  );
}

// Session files are { layer: { position: count } }
function parseSession(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not a session file');
  let total = 0;
  for (const [layer, positions] of Object.entries(data)) {
    if (!/^\d+$/.test(layer) || !positions || typeof positions !== 'object') throw new Error('not a session file');
    for (const [pos, n] of Object.entries(positions)) {
      if (!/^\d+$/.test(pos) || !Number.isInteger(n) || n < 0) throw new Error('not a session file');
      total += n;
    }
  }
  return { counts: data, total };
}

async function addFiles(fileList) {
  const skipped = [];
  for (const file of fileList) {
    if (!file.name.endsWith('.json')) {
      skipped.push(`${file.name} (sessions must be .json)`);
      continue;
    }
    // The same session dropped twice would double its counts
    if (state.files.has(file.name)) {
      skipped.push(`${file.name} (already loaded)`);
      continue;
    }
    try {
      state.files.set(file.name, parseSession(await file.text()));
    } catch {
      skipped.push(`${file.name} (not a session file)`);
    }
  }
  render();
  if (skipped.length) alert(`Skipped:\n${skipped.join('\n')}`);
}

// --- Keymap labels -------------------------------------------------------

// Short forms for common behaviors; anything else shows its name in the corner
// and its parameters as the label, like keymap-editor
const MOD_PREFIX = { LS: '⇧', RS: '⇧', LC: '⌃', RC: '⌃', LA: '⌥', RA: '⌥', LG: '⌘', RG: '⌘' };

function keycodeLabel(code) {
  // Modifier functions like LG(SQT) or LC(LS(TAB))
  const fn = code.match(/^([A-Z]{2})\((.+)\)$/);
  if (fn && MOD_PREFIX[fn[1]]) return MOD_PREFIX[fn[1]] + keycodeLabel(fn[2]);
  return KEYCODE_LABELS[code] ?? code;
}

function bindingLabel({ behavior, params }) {
  switch (behavior) {
    case 'trans':
      return { tag: '', text: '▽' };
    case 'none':
      return { tag: '', text: '' };
    case 'kp':
      return { tag: '', text: keycodeLabel(params[0] ?? ''), icon: KEYCODE_ICONS[params[0]] };
    case 'bt':
      return { tag: 'bt', text: params.map((p) => p.replace(/^BT_/, '')).join(' ') };
    default:
      return { tag: behavior, text: params.map(keycodeLabel).join(' ') };
  }
}

// Object-like #defines only (e.g. #define BASE 0); function-like macros are left as is
function applyDefines(text) {
  const defines = {};
  const body = text.replace(/^[ \t]*#define[ \t]+([A-Za-z_]\w*)(?!\()[ \t]+(.+)$/gm, (_, name, value) => {
    defines[name] = value.trim();
    return '';
  });
  const names = Object.keys(defines);
  if (!names.length) return body;
  const re = new RegExp(`\\b(${names.join('|')})\\b`, 'g');
  return body.replace(re, (name) => defines[name]);
}

// Returns the text between the brace at `open` and its match
function braceBody(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}

function parseKeymap(text) {
  text = applyDefines(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));

  const compat = text.search(/compatible\s*=\s*"zmk,keymap"/);
  if (compat < 0) throw new Error('no node with compatible = "zmk,keymap"');
  const body = braceBody(text, text.lastIndexOf('{', compat));

  const layers = [];
  const warnings = [];
  // Each child node of the keymap node is a layer, in order
  const child = /(?:[\w-]+:\s*)?([\w-]+)\s*\{/g;
  let m;
  while ((m = child.exec(body))) {
    const open = m.index + m[0].length - 1;
    const node = braceBody(body, open);
    child.lastIndex = open + node.length + 2;

    const bindings = node.match(/bindings\s*=\s*<([^>]*)>/)?.[1];
    if (bindings === undefined) continue;
    const name = node.match(/display-name\s*=\s*"([^"]*)"/)?.[1] || m[1];
    const parsed = bindings
      .split('&')
      .slice(1)
      .map((b) => {
        const [behavior, ...params] = b.trim().split(/\s+/);
        return { behavior, params };
      });

    if (parsed.length !== LAYOUT.length) {
      warnings.push(`${name}: ${parsed.length} bindings, expected ${LAYOUT.length}; labels skipped`);
      layers.push({ name, labels: null });
      continue;
    }
    layers.push({ name, labels: parsed.map(bindingLabel) });
  }
  if (!layers.length) throw new Error('no layers with bindings found');
  return { layers, warnings };
}

function labelsForView() {
  // Overall mixes every layer, so no single layer's labels fit it
  if (!state.keymap || state.view === 'overall') return null;
  return state.keymap.layers[state.view]?.labels ?? null;
}

function renderLabel(el, label) {
  el.replaceChildren();
  delete el.dataset.binding;
  if (!label) return;
  if (label.tag) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = label.tag;
    el.append(tag);
  }
  const text = document.createElement('span');
  text.className = 'label';
  if (label.icon) {
    text.innerHTML = ICON_SVGS[label.icon]; // static SVG from icons.js
  } else {
    text.textContent = label.text;
    if (label.text.length > 3) text.dataset.long = 'true';
  }
  el.append(text);
  el.dataset.binding = [label.tag, label.text].filter(Boolean).join(' ');
}

function renderKeymap() {
  const items = [];
  if (state.keymap) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = state.keymap.name;
    const layers = document.createElement('span');
    layers.className = 'total';
    layers.textContent = `${state.keymap.layers.length} layers`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${state.keymap.name}`);
    remove.addEventListener('click', () => {
      state.keymap = null;
      render();
    });
    li.append(label, layers, remove);
    items.push(li);
    for (const w of state.keymap.warnings) {
      const warn = document.createElement('li');
      warn.className = 'warning';
      warn.textContent = w;
      items.push(warn);
    }
  }
  $('keymap-files').replaceChildren(...items);
}

async function addKeymap(fileList) {
  const file = fileList[0];
  if (!file) return;
  if (!file.name.endsWith('.keymap')) {
    alert(`Skipped ${file.name}: the keymap must be a ZMK .keymap file`);
    return;
  }
  try {
    state.keymap = { name: file.name, ...parseKeymap(await file.text()) };
  } catch (err) {
    alert(`Could not read ${file.name}: ${err.message}`);
    return;
  }
  render();
}

// Shrink the board to fit narrow screens
function fit() {
  const available = $('board-wrap').clientWidth;
  const s = Math.min(1, available / boardWidth);
  board.style.transform = `scale(${s})`;
  $('board-wrap').style.height = `${boardHeight * s}px`;
}

function showTooltip(el) {
  const n = Number(el.dataset.count);
  const label = el.dataset.binding ? ` (${el.dataset.binding})` : '';
  tooltip.textContent = `Position ${el.dataset.position}${label}: ${n.toLocaleString()} ${n === 1 ? 'press' : 'presses'}`;
  tooltip.hidden = false;
  const wrap = $('board-wrap').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  tooltip.style.left = `${r.left - wrap.left + r.width / 2 - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${r.top - wrap.top - tooltip.offsetHeight - 6}px`;
}

$('keys').addEventListener('mouseover', (e) => {
  const el = e.target.closest('.key');
  if (el) showTooltip(el);
});
$('keys').addEventListener('mouseleave', () => (tooltip.hidden = true));

for (const b of document.querySelectorAll('.mode button')) {
  b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    for (const other of document.querySelectorAll('.mode button')) {
      other.setAttribute('aria-pressed', String(other === b));
    }
    render();
  });
}

// Two drop zones: sessions take only .json, the keymap only .keymap. Anywhere
// else, a drop is swallowed so the browser doesn't navigate to the file.
for (const type of ['dragover', 'drop']) document.addEventListener(type, (e) => e.preventDefault());

function dropZone(zone, onFiles) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('over');
  });
  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('over');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('over');
    onFiles(e.dataTransfer.files);
  });
}

dropZone($('drop'), addFiles);
dropZone($('keymap-drop'), (files) => addKeymap(files));
$('picker').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});
$('keymap-picker').addEventListener('change', (e) => {
  addKeymap(e.target.files);
  e.target.value = '';
});
$('legend-bar').style.background = `linear-gradient(to top, ${PALETTE_STOPS.map(([at, c]) => `${c} ${at * 100}%`).join(', ')})`;
window.addEventListener('resize', fit);

buildKeys();
render();
