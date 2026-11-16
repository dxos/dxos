//
// Copyright 2026 DXOS.org
//

// Writes a horizontal logotype per product, black and white, in the geometry of `dxos-horizontal-white.svg`.
// The letters are Sharp Sans Display No1 Medium at the DXOS size and baseline; the mark fills the DXOS mark's box.
// Every product shares one mark box, one line weight and one justified text width, so stacked logotypes line up.
// Usage: node scripts/build-logotypes.mjs [name...]

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../assets');

/** Product name, as set in the wordmark, to the icon that is its mark. */
const PRODUCTS = {
  echo: { word: 'ECHO', icon: 'echo' },
  halo: { word: 'HALO', icon: 'halo' },
  mesh: { word: 'MESH', icon: 'mesh' },
  plex: { word: 'PLEX', icon: 'kube' },
  edge: { word: 'EDGE', icon: 'dxns' },
};

/** The group transform of `dxos-horizontal-white.svg`; every length below is in its local units. */
const GROUP = 'matrix(0.64,0,0,0.64,62.0285,170.667)';
const GROUP_SCALE = 0.64;
const GROUP_X = 62.0285;

/** Cap height 480.6 over the font's 730, so the font's 1000-unit em is this many local units. */
const FONT_SIZE = (480.6 / 730) * 1000;
const BASELINE = 760.9;
const TRACKING = 0.06;

/** The DXOS mark's center and size, and the weight of its lines, which every mark is fitted to. */
const MARK_CENTER = { x: 523.3, y: 533.2 };
const MARK_SIZE = 962;
const MARK_WEIGHT = 42.6;

/** Space between the mark's box and the first letter's ink. */
const GAP = 200;

const VIEW_HEIGHT = 1024;

/** The DXOS file leaves 94 units between the artwork and each side of its view box. */
const MARGIN = 94;

const font = opentype.parse(readFileSync(join(ASSETS, 'fonts/sharp-sans/SharpSansDispNo1-Medium.ttf')));
const em = FONT_SIZE / font.unitsPerEm;

/** Each path or rect of an icon as its polygons (an outline and its holes), in the icon's 256-unit grid. */
const polygons = (svg) => {
  const scale = Number(/<g transform="matrix\(([\d.]+),0,0,[\d.]+,0,0\)"/.exec(svg)?.[1] ?? 1);
  const result = [];
  for (const [, d] of svg.matchAll(/<path d="([^"]+)"/g)) {
    const path = [];
    result.push(path);
    let point = [0, 0];
    let polygon;
    for (const [, command, args] of d.matchAll(/([MmLlHhVvZz])([^MmLlHhVvZz]*)/g)) {
      const numbers = (args.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
      const relative = command === command.toLowerCase();
      const next = (x, y) => {
        point = relative ? [point[0] + x, point[1] + y] : [x, y];
        polygon.push(point);
      };
      switch (command.toUpperCase()) {
        case 'M':
          polygon = [];
          path.push(polygon);
          for (let i = 0; i < numbers.length; i += 2) {
            next(numbers[i], numbers[i + 1]);
          }
          break;
        case 'L':
          for (let i = 0; i < numbers.length; i += 2) {
            next(numbers[i], numbers[i + 1]);
          }
          break;
        case 'H':
          numbers.forEach((x) => next(x, relative ? 0 : point[1]));
          break;
        case 'V':
          numbers.forEach((y) => next(relative ? 0 : point[0], y));
          break;
        case 'Z':
          point = polygon[0];
          break;
      }
    }
  }
  for (const [, x, y, width, height] of svg.matchAll(
    /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
  )) {
    const [left, top] = [Number(x), Number(y)];
    result.push([
      [
        [left, top],
        [left + Number(width), top],
        [left + Number(width), top + Number(height)],
        [left, top + Number(height)],
      ],
    ]);
  }
  return {
    scale,
    paths: result.map((path) => path.map((polygon) => polygon.map(([x, y]) => [x * scale, y * scale]))),
  };
};

const contains = (polygon, [x, y]) =>
  polygon.reduce((inside, [x1, y1], i) => {
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    return y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1 ? !inside : inside;
  }, false);

/** Ink box and line weight of an icon; the weight is twice area over perimeter, which holds for thin strokes. */
const measure = (svg) => {
  const { scale, paths } = polygons(svg);
  const points = paths.flat(2);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  let area = 0;
  let perimeter = 0;
  for (const path of paths) {
    for (const polygon of path) {
      let signed = 0;
      polygon.forEach(([x1, y1], i) => {
        const [x2, y2] = polygon[(i + 1) % polygon.length];
        signed += x1 * y2 - x2 * y1;
        perimeter += Math.hypot(x2 - x1, y2 - y1);
      });
      // Icons fill even-odd, so a polygon inside an odd number of its path's others is a hole.
      const depth = path.filter((other) => other !== polygon && contains(other, polygon[0])).length;
      area += ((depth % 2 === 0 ? 1 : -1) * Math.abs(signed)) / 2;
    }
  }
  return {
    scale,
    box: { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) },
    weight: (2 * Math.abs(area)) / perimeter,
  };
};

/** The icon, scaled to the shared mark box and outlined so its lines reach the shared weight. */
const mark = (name, fill) => {
  const svg = readFileSync(join(ASSETS, `icons/${name}.svg`), 'utf8');
  const { scale: inner, box, weight } = measure(svg);
  const extent = Math.max(box.right - box.left, box.bottom - box.top);
  const scale = (MARK_SIZE - MARK_WEIGHT) / (extent - weight);
  const outline = MARK_WEIGHT / scale - weight;
  const x = MARK_CENTER.x - (scale * (box.left + box.right)) / 2;
  const y = MARK_CENTER.y - (scale * (box.top + box.bottom)) / 2;
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    // An inner scale would scale the outline too.
    .replace(/(<g transform="matrix\([^"]+\)")/, `$1 style="stroke-width:${(outline / inner).toFixed(3)};"`)
    .trim();
  return [
    `    <g transform="matrix(${scale.toFixed(5)},0,0,${scale.toFixed(5)},${x.toFixed(3)},${y.toFixed(3)})" style="stroke:${fill ?? 'black'};stroke-width:${outline.toFixed(3)};stroke-linejoin:round;">`,
    ...body.split('\n').map((line) => `      ${line.trim()}`),
    '    </g>',
  ];
};

/** Every wordmark spans the DXOS wordmark's ink, kerned and tracked as in the original. */
const TEXT_WIDTH = (() => {
  const box = font.getPath('DXOS', 0, BASELINE, FONT_SIZE, { kerning: true, letterSpacing: TRACKING }).getBoundingBox();
  return box.x2 - box.x1;
})();
const TEXT_LEFT = MARK_CENTER.x + MARK_SIZE / 2 + GAP;

/** Justified: the first letter's ink starts at the left edge, the last ends at the right, and the gaps between are equal. */
const wordPath = (word) => {
  const glyphs = [...word].map((letter) => {
    const glyph = font.charToGlyph(letter);
    const box = glyph.getPath(0, BASELINE, FONT_SIZE).getBoundingBox();
    return { glyph, left: box.x1, width: box.x2 - box.x1 };
  });
  const gap = (TEXT_WIDTH - glyphs.reduce((sum, { width }) => sum + width, 0)) / (glyphs.length - 1);
  const path = new opentype.Path();
  let x = TEXT_LEFT;
  for (const { glyph, left, width } of glyphs) {
    path.extend(glyph.getPath(x - left, BASELINE, FONT_SIZE));
    x += width + gap;
  }
  return path;
};

const WIDTH = Math.ceil(
  Math.max(...Object.values(PRODUCTS).map(({ word }) => wordPath(word).getBoundingBox().x2)) * GROUP_SCALE +
    GROUP_X +
    MARGIN,
);

const logotype = ({ word, icon }, fill) => {
  const style = fill ? ` style="fill:${fill};"` : '';
  return [
    `<svg width="100%" height="100%" viewBox="0 0 ${WIDTH} ${VIEW_HEIGHT}" version="1.1" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;">`,
    `  <g transform="${GROUP}"${style}>`,
    ...mark(icon, fill),
    `    <path d="${wordPath(word).toPathData(3)}"/>`,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
};

const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(PRODUCTS);
for (const name of names) {
  const product = PRODUCTS[name];
  if (!product) {
    throw new Error(`Unknown product: ${name}`);
  }
  for (const [suffix, fill] of [
    ['black', undefined],
    ['white', 'white'],
  ]) {
    const file = join(ASSETS, `logotypes/${name}-horizontal-${suffix}.svg`);
    writeFileSync(file, logotype(product, fill));
    console.log(file);
  }
}
