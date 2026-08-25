#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Regenerate the macOS app icon from the shared full-bleed artwork.
//
// macOS renders an app icon exactly as given — unlike iOS, it applies no mask, and `tauri icon` adds no
// margin either — so the rounded tile and the margin around it have to be drawn into the artwork or the
// dock shows a hard square that also sits taller than its neighbours.
//
// This runs as its own pass rather than inside `gen-icon-variants.mjs` because the shape must NOT reach
// the other platforms: iOS masks the icon itself (a pre-rounded source gets double-rounded, leaving dark
// corners), and the Windows and Android sets expect full bleed. Only the four files macOS reads are taken
// from the rounded rasterization; `icon.ico` and the iOS/Android sets stay as `tauri icon` drew them from
// the square source.
//
// Usage: pnpm icons:macos

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const tauri = join(root, 'node_modules', '.bin', 'tauri');

/** Source artwork paired with the `src-tauri` directory `bundle.icon` points at for that channel. */
const CHANNELS = [
  { source: 'icon.svg', icons: 'icons' },
  { source: 'icon-purple.svg', icons: 'icons-preview' },
  { source: 'icon-rust.svg', icons: 'icons-rust' },
];

/**
 * The `.icns` is the whole macOS surface: the bundler installs it as the app's icon and reads nothing
 * else. The loose PNGs `bundle.icon` also names belong to the Linux deb/AppImage bundles and `icon.ico`
 * to Windows, neither of which wants a rounded tile, so both keep the square artwork.
 */
const MACOS_ICONS = ['icon.icns'];

/**
 * The macOS icon grid, as a fraction of the canvas for the tile and of the tile for its corner radius.
 * Measured off the shipping Terminal.app and Chrome icons rather than taken from the published Big Sur
 * grid (824/1024, r=0.225), which renders visibly small beside them on macOS 26.
 */
const TILE = 214 / 256;
const RADIUS = 47 / 214;

/**
 * Inset the artwork into Apple's tile and clip it to the tile's rounded rect. The source viewBox is
 * assumed square; its own background rect becomes the tile because everything outside is clipped away.
 * `source` is stamped into the output so a hand edit here is visibly the wrong place to make one.
 */
const squircle = (svg, source) => {
  const viewBox = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\s*"/);
  if (!viewBox || viewBox[1] !== viewBox[2]) {
    throw new Error(`${source}: expected a square viewBox starting at 0 0`);
  }

  const canvas = Number(viewBox[1]);
  const tile = canvas * TILE;
  const offset = (canvas - tile) / 2;
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) {
    throw new Error(`${source}: no <svg> element`);
  }

  const head = svg.slice(0, open.index + open[0].length);
  const body = svg.slice(open.index + open[0].length).replace(/<\/svg>\s*$/, '');
  const clip = [
    '<defs><clipPath id="_macosTile">',
    `<rect x="${offset}" y="${offset}" width="${tile}" height="${tile}" rx="${tile * RADIUS}"/>`,
    '</clipPath></defs>',
  ].join('');

  // The clip and the transform sit on separate elements: an element's `clip-path` resolves in the user
  // space its own `transform` establishes, so combining them would scale the tile along with the artwork.
  return [
    head.replace(
      '<svg ',
      `<!-- Generated from assets/${source} by scripts/gen-macos-icon.mjs; run \`pnpm icons:macos\` to update. -->\n<svg `,
    ),
    clip,
    '<g clip-path="url(#_macosTile)">',
    `<g transform="translate(${offset},${offset}) scale(${TILE})">`,
    body,
    '</g></g></svg>',
  ].join('\n');
};

for (const { source, icons } of CHANNELS) {
  const svg = squircle(readFileSync(join(assets, source), 'utf8'), source);
  const rounded = source.replace(/\.svg$/, '-macos.svg');
  writeFileSync(join(assets, rounded), svg);

  // `tauri icon` rewrites `gen/apple`'s asset catalog whenever it finds one beside its output, so it runs
  // from a scratch directory and only the macOS files are copied back.
  const scratch = mkdtempSync(join(tmpdir(), 'icon-macos-'));
  try {
    writeFileSync(join(scratch, 'icon.svg'), svg);
    execFileSync(tauri, ['icon', 'icon.svg', '-o', 'out'], { cwd: scratch, stdio: 'inherit' });
    // The channel directories are checked in; creating one here would quietly accept a typo in CHANNELS
    // and leave the real directory stale.
    const dir = join(root, 'src-tauri', icons);
    if (!existsSync(dir)) {
      throw new Error(`src-tauri/${icons}: no such directory`);
    }
    for (const icon of MACOS_ICONS) {
      copyFileSync(join(scratch, 'out', icon), join(dir, icon));
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  console.log(`assets/${rounded} -> src-tauri/${icons} (${MACOS_ICONS.join(', ')})`);
}
