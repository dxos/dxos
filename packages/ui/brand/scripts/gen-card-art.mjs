//
// Copyright 2026 DXOS.org
//

// Writes the card crops of each background into `assets/backgrounds/cards/`: one file per mark per card width.
//
// A card shows the mark at a fixed size whatever the card's width, which `object-fit` alone cannot do — it derives its
// scale from the box, so a card spanning two columns draws its mark twice the size of its neighbours'. The scale is
// pinned instead by the window each file carries: every crop is 900 units tall and centred on the mark at (960, 540),
// so equal card heights give an equal scale, and a crop twice as wide fills a card twice as wide at that same scale.
//
// A wider window reaches outside the art's 1920 x 1080 frame, where its lines stop, so the lines are run on along
// their own direction first. This mirrors what the docs do at build time (docs/src/components/topic-nav/suite.ts).
//
// Usage: node scripts/gen-card-art.mjs

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKGROUNDS = join(dirname(fileURLToPath(import.meta.url)), '../assets/backgrounds');
const OUT = join(BACKGROUNDS, 'cards');

/** The art's lines stop at this frame; a point on it is an end to run on, not a corner the artist drew. */
const FRAME = { left: -20, right: 1940, top: -20, bottom: 1100 };

/** Far enough past the frame for any crop here, the widest card's included. */
const REACH = 4000;

/** Each crop is this tall and centred on the mark, which is what holds the mark's size constant across card widths. */
const WINDOW = { height: 900, top: 90, centre: 960 };

/** The card widths to emit, as a multiple of a single card: `1x` for one column, `2x` for two. */
const WIDTHS = [1, 2];

/** The window a card of `width` columns takes, as a viewBox. */
const viewBox = (width) => {
  // A single card is 8:5, so its window is 1440 x 900; each further column adds another 1440.
  const span = 1440 * width;
  return `${WINDOW.centre - span / 2} ${WINDOW.top} ${span} ${WINDOW.height}`;
};

const onFrame = ([x, y]) =>
  [x - FRAME.left, x - FRAME.right, y - FRAME.top, y - FRAME.bottom].some((gap) => Math.abs(gap) < 0.5);

/** A line's path with each end that stops at the frame run on along its own direction. */
const extend = (data) => {
  const points = [...data.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(([, x, y]) => [Number(x), Number(y)]);
  // A closed path or a multi-segment one is a shape, not a ray: it is left alone.
  if (points.length < 2 || /Z/.test(data) || (data.match(/M/g)?.length ?? 0) > 1) {
    return data;
  }
  const run = ([x, y], [fromX, fromY]) => {
    const length = Math.hypot(x - fromX, y - fromY);
    return length === 0 ? [x, y] : [x + ((x - fromX) / length) * REACH, y + ((y - fromY) / length) * REACH];
  };
  const last = points.length - 1;
  if (onFrame(points[0])) {
    points[0] = run(points[0], points[1]);
  }
  if (onFrame(points[last])) {
    points[last] = run(points[last], points[last - 1]);
  }
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
};

/** Only the `lines` group is run on; the mark itself is drawn as it is. */
const extendLines = (svg) =>
  svg.replace(/<g id="lines"[\s\S]*?<\/g>/, (group) =>
    group.replace(/ d="([^"]*)"/g, (_, data) => ` d="${extend(data)}"`),
  );

/** The background rect covers the frame only, so a wider window would show the page through it. */
const fillWindow = (svg, box) => {
  const [x, y, width, height] = box.split(' ');
  return svg.replace(
    /<rect id="background"[^>]*\/>/,
    `<rect id="background" x="${x}" y="${y}" width="${width}" height="${height}" style="fill: var(--dx-bg-fill, rgb(29,31,32))"/>`,
  );
};

mkdirSync(OUT, { recursive: true });

let written = 0;
for (const file of readdirSync(BACKGROUNDS).filter((name) => /^bg-.*-center\.svg$/.test(name))) {
  const mark = file.replace(/^bg-(.*)-center\.svg$/, '$1');
  const source = extendLines(readFileSync(join(BACKGROUNDS, file), 'utf8'));
  for (const width of WIDTHS) {
    const box = viewBox(width);
    const svg = fillWindow(source, box).replace(/viewBox="[^"]*"/, `viewBox="${box}"`);
    writeFileSync(join(OUT, `${mark}-${width}x.svg`), svg);
    written += 1;
  }
}

console.log(`wrote ${written} card crops to assets/backgrounds/cards/`);
