#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Regenerate the macOS menu bar icon.
//
// The menu bar wants a template image: macOS throws away the colour and tints the alpha channel to match
// the bar, so the mark has to survive as a silhouette. It does not survive as-is — the four rings are drawn
// edge to edge (bands at r = 15.75, 39.75, 63.75, 87.75, 111.75 about the mark's centre) and are told apart
// by colour alone, so flattening them to one fill yields a solid disc.
//
// So the rings are cut apart: everything is filled black, then a clip path drops a gap either side of each
// band boundary. Concentric circles wound in alternating directions cancel under the default nonzero fill
// rule, which leaves the bands and removes the gaps — `evenodd` would read more directly but is honoured
// less consistently across rasterizers, and a silently unclipped render is the solid disc again.
//
// Usage: pnpm icons:menubar

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tauri = join(root, 'node_modules', '.bin', 'tauri');
const brandMark = join(root, '..', '..', 'ui', 'brand', 'assets', 'icons', 'composer-icon.svg');
const target = join(root, 'src-tauri', 'icons', 'menubarTemplate.png');

/** Centre of the mark's rings, in the source viewBox's units. */
const CENTRE = { x: 128, y: 128 };

/** Ring boundaries outwards from the centre; each neighbouring pair is one band. */
const EDGES = [15.75, 39.75, 63.75, 87.75, 111.75];

/**
 * Half the width of the gap opened at each boundary, in the same units.
 * Tuned by eye at 22px — the bands read as separate swoops from here, and thin to hairlines much beyond it.
 */
const GAP = 4;

/**
 * Square viewBox framing the mark, which sits off-centre in the source's own. Fixed rather than measured,
 * since measuring means rasterizing first; it needs revisiting if the mark's geometry ever moves.
 */
const VIEW_BOX = '-22.96 7.04 241.92 241.92';

/**
 * `tauri icon` writes a fixed set of sizes, none of them the ~44px a retina menu bar wants. Android's mdpi
 * launcher is the closest at 48px, and is a plain transparent render like the rest — the same borrowing the
 * favicon generator does in `gen-icon-variants.mjs`.
 */
const RASTERIZED = join('android', 'mipmap-mdpi', 'ic_launcher.png');

/** A circle as two arcs; `sweep` picks its winding direction. */
const circle = (radius, sweep) =>
  `M${CENTRE.x - radius},${CENTRE.y} ` +
  `a${radius},${radius} 0 1,${sweep} ${radius * 2},0 ` +
  `a${radius},${radius} 0 1,${sweep} ${-radius * 2},0 Z `;

/** One clip path keeping every band and dropping the gaps between them. */
const bandClip = () => {
  const rings = EDGES.slice(1).flatMap((outer, index) => [circle(outer - GAP, 1), circle(EDGES[index] + GAP, 0)]);
  return `<defs><clipPath id="bands"><path d="${rings.join('')}"/></clipPath></defs>`;
};

const source = readFileSync(brandMark, 'utf8');

// The mark's own group is wrapped rather than edited, so the clip sits in the same space as the ring geometry.
const [, markGroup] = source.match(/(<g transform="matrix\(0\.969697[^>]*>)/) ?? [];
if (!markGroup) {
  throw new Error('Could not find the mark group in the brand icon; its geometry has changed.');
}

const svg = source
  .replace(/fill:rgb\(\d+,\d+,\d+\)/g, 'fill:#000000')
  .replace(/viewBox="[^"]*"/, `viewBox="${VIEW_BOX}"`)
  .replace(markGroup, `${bandClip()}<g clip-path="url(#bands)">${markGroup}`)
  .replace('</svg>', '</g></svg>')
  .replace(
    '<svg ',
    '<!-- Generated from @dxos/brand composer-icon.svg by scripts/gen-menubar-icon.mjs; ' +
      'run `pnpm icons:menubar` to update. -->\n<svg ',
  );

// Runs from a scratch directory: `tauri icon` also rewrites `gen/apple`'s asset catalog whenever it finds one
// next to it, so pointing `-o` elsewhere is not enough to keep it off the iOS icons.
const scratch = mkdtempSync(join(tmpdir(), 'menubar-icon-'));
try {
  writeFileSync(join(scratch, 'icon.svg'), svg);
  execFileSync(tauri, ['icon', 'icon.svg', '-o', 'out'], { cwd: scratch, stdio: 'inherit' });
  copyFileSync(join(scratch, 'out', RASTERIZED), target);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log('@dxos/brand composer-icon.svg -> src-tauri/icons/menubarTemplate.png');
