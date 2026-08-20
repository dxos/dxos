#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Regenerate the per-channel brand artwork.
//
// Each non-production channel installs and runs as its own app (see `.github/actions/cn-config`), so it
// needs its own mark or a dock — and a row of browser tabs — holds several identical tiles. These are
// recolourings rather than redraws: only the hue and saturation of the shared four-colour ramp change, so
// every variant keeps production's geometry and contrast.
//
// Three pieces of artwork carry the mark, all drawn from the same ramp:
//   - the desktop app icon        (`assets/icon.svg`, on its near-black tile)
//   - the favicon set             (`assets/favicon.svg`, transparent)
//   - the boot loader's mark      (`@dxos/brand`'s `composer-icon.svg`, transparent)
//
// Usage: pnpm icons:variants

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const tauri = join(root, 'node_modules', '.bin', 'tauri');
const brandMark = join(root, '..', '..', 'ui', 'brand', 'assets', 'icons', 'composer-icon.svg');

/**
 * `hue` in degrees replaces the ramp's own hue; `saturation` and `lightness` scale what is there.
 * Lightness is scaled rather than set so the four steps stay proportional to one another.
 * `icons` is the `src-tauri` directory `cn-config` points `bundle.icon` at.
 */
const VARIANTS = {
  purple: {
    icons: 'icons-preview',
    hue: 282,
    saturation: 1,
    lightness: 1,
  },
  rust: {
    icons: 'icons-rust',
    hue: 20,
    // Held below the source ramp's near-full saturation: at full it reads as a warning colour rather
    // than as rust, and competes with the app's own error states.
    saturation: 0.75,
    lightness: 1,
  },
};

/** The ramp shared by all three pieces of artwork, brightest first. */
const RAMP = [
  [6, 197, 253],
  [1, 122, 183],
  [10, 75, 105],
  [5, 40, 61],
];

/**
 * The only icons `bundle.icon` names. `tauri icon` also writes Windows Store, Android and iOS sets, which
 * a desktop-only channel build never reads — and the iOS set in particular would go stale here, since
 * `tauri ios init` generates its asset catalog from the stock `icons/` directory.
 */
const BUNDLE_ICONS = ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico'];

/**
 * The browser-facing icons — `index.html`'s `<link rel=icon>` set plus `site.webmanifest`'s pair —
 * mapped to the `tauri icon` output drawn at that size. Reusing the icon generator keeps this script
 * free of a second rasterizer; the sizes line up because Android's launcher densities cover 96 and 192,
 * iOS's 60pt @3x is 180, and the root `icon.png` is 512.
 */
const FAVICONS = {
  'favicon-96x96.png': join('android', 'mipmap-xhdpi', 'ic_launcher.png'),
  'apple-touch-icon.png': join('ios', 'AppIcon-60x60@3x.png'),
  'web-app-manifest-192x192.png': join('android', 'mipmap-xxxhdpi', 'ic_launcher.png'),
  'web-app-manifest-512x512.png': 'icon.png',
  'favicon.ico': 'icon.ico',
};

const toHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / d + 2) / 6
        : ((rn - gn) / d + 4) / 6;
  return [h, s, l];
};

const toRgb = (h, s, l) => {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    const v = tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < 1 / 2 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p;
    return Math.round(v * 255);
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
};

/**
 * Apply a variant's transform to every ramp colour in an SVG, leaving the rest of the markup alone.
 * `source` names the artwork this was derived from, stamped into the output so a hand edit here is
 * visibly the wrong place to make one.
 */
const recolour = (svg, source, { hue, saturation, lightness }) => {
  const recoloured = RAMP.reduce((acc, colour) => {
    const [h, s, l] = toHsl(colour);
    const [r, g, b] = toRgb(hue / 360, s * saturation, Math.min(1, l * lightness));
    return acc.replace(`fill:rgb(${colour.join(',')})`, `fill:rgb(${r},${g},${b})`);
  }, svg);
  return recoloured.replace(
    '<svg ',
    `<!-- Generated from ${source} by scripts/gen-icon-variants.mjs; run \`pnpm icons:variants\` to update. -->\n<svg `,
  );
};

/**
 * Rasterize an SVG through `tauri icon` and hand the output directory to `collect`.
 * Runs from a scratch directory: `tauri icon` also rewrites `gen/apple`'s asset catalog whenever it finds
 * one next to it, so pointing `-o` elsewhere is not enough to keep it off the iOS icons.
 */
const rasterize = (svg, collect) => {
  const scratch = mkdtempSync(join(tmpdir(), 'icon-variant-'));
  try {
    writeFileSync(join(scratch, 'icon.svg'), svg);
    execFileSync(tauri, ['icon', 'icon.svg', '-o', 'out'], { cwd: scratch, stdio: 'inherit' });
    collect(join(scratch, 'out'));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

const write = (dir, name, contents) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), contents);
};

const appSource = readFileSync(join(assets, 'icon.svg'), 'utf8');
const faviconSource = readFileSync(join(assets, 'favicon.svg'), 'utf8');
const bootSource = readFileSync(brandMark, 'utf8');

for (const [name, variant] of Object.entries(VARIANTS)) {
  const appSvg = recolour(appSource, 'assets/icon.svg', variant);
  writeFileSync(join(assets, `icon-${name}.svg`), appSvg);
  rasterize(appSvg, (out) => {
    const dir = join(root, 'src-tauri', variant.icons);
    mkdirSync(dir, { recursive: true });
    for (const icon of BUNDLE_ICONS) {
      copyFileSync(join(out, icon), join(dir, icon));
    }
  });
  console.log(`assets/icon-${name}.svg -> src-tauri/${variant.icons}`);

  const faviconSvg = recolour(faviconSource, 'assets/favicon.svg', variant);
  const favicons = join(assets, `favicons-${name}`);
  write(favicons, 'favicon.svg', faviconSvg);
  rasterize(faviconSvg, (out) => {
    for (const [target, source] of Object.entries(FAVICONS)) {
      copyFileSync(join(out, source), join(favicons, target));
    }
  });
  console.log(`assets/favicon.svg -> assets/favicons-${name}`);

  writeFileSync(join(assets, `boot-mark-${name}.svg`), recolour(bootSource, '@dxos/brand composer-icon.svg', variant));
  console.log(`@dxos/brand composer-icon.svg -> assets/boot-mark-${name}.svg`);
}
