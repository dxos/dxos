//
// Copyright 2026 DXOS.org
//

import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import fs from 'node:fs';
// Render spots to out/ using the naming convention DXOS_SI_[ID]_[length]_[ratio]_v[NN].mp4
//
//   moon run autocue:render                          # everything (14 provocations x 2 lengths x 5 formats)
//   moon run autocue:render -- --id P03              # one provocation, all lengths and formats
//   moon run autocue:render -- --id OPEN,COMPOSER,CLOSE # several ids, comma-separated
//   moon run autocue:render -- --id P03 --length 10s --format 16x9
//   moon run autocue:render -- --id OPEN             # open title only, all formats
//   moon run autocue:render -- --id TRAIL            # DXOS trail only, all formats
//   moon run autocue:render -- --id CLOSE              # close card only, all formats
//   moon run autocue:render-first-run                # only provocations marked firstRun
//   moon run autocue:render-all                      # everything except the TRAIL stub (--exclude TRAIL)
//   moon run autocue:render -- --version 2           # file suffix _v02
//   moon run autocue:render -- --id CLOSE --theme light --logo-color sky   # file suffix _light_sky
//   moon run autocue:render -- --id COMPOSER --fps 60  # file suffix _60fps
//
// Set REMOTION_BROWSER to a Chrome/Chromium path to skip Remotion's browser download.
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const firstRunOnly = args.includes('--first-run');
const exclude = opt('exclude')?.split(',') ?? [];
const only = { ids: opt('id')?.split(','), length: opt('length'), format: opt('format') };
const version = String(opt('version') ?? '1').padStart(2, '0');
// The palette (see src/components/Ident/theme.tsx): every composition takes it as props, and the file name carries it.
const inputProps = { theme: opt('theme') ?? 'dark', logoColor: opt('logo-color') };
// A showcase cut runs at 60 fps; the compositions time everything from `fps`, so they render at any rate.
const fpsOverride = (() => {
  if (!args.includes('--fps')) {
    return undefined;
  }
  const fps = Number(opt('fps'));
  if (opt('fps')?.startsWith('--') || !Number.isFinite(fps) || fps <= 0) {
    console.error(`--fps takes a positive number, not ${opt('fps') ?? 'nothing'}`);
    process.exit(2);
  }
  return fps;
})();
const variant = `${inputProps.theme === 'light' ? '_light' : ''}${inputProps.logoColor ? `_${inputProps.logoColor}` : ''}${fpsOverride ? `_${fpsOverride}fps` : ''}`;
const browserExecutable = process.env.REMOTION_BROWSER || null;
// The DXOS trail is WebGL; headless Chrome's default GL backend cannot run its float-texture shaders.
const chromiumOptions = { gl: 'angle' };

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'out');

// Which provocations are in the first run (read from the source so there is one list).
const src = fs.readFileSync(path.join(root, 'src/components/Ident/provocations.ts'), 'utf8');
const firstRunIds = [...src.matchAll(/id: '(P\d+)'[\s\S]*?firstRun: (true|false)/g)]
  .filter((m) => m[2] === 'true')
  .map((m) => m[1]);

console.log('Bundling…');
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/components/Ident/remotion.ts') });
const comps = await getCompositions(serveUrl, { browserExecutable, chromiumOptions, inputProps });

const selected = comps.filter((c) => {
  const [id, length, format] = c.id.split('-');
  if (exclude.includes(id)) {
    return false;
  }
  if (only.ids && !only.ids.includes(id)) {
    return false;
  }
  if (only.length && length !== only.length) {
    return false;
  }
  if (only.format && format !== only.format) {
    return false;
  }
  if (firstRunOnly && !firstRunIds.includes(id)) {
    return false;
  }
  return true;
});

if (!selected.length) {
  console.error('Nothing matched. Composition ids look like P03-10s-16x9.');
  process.exit(1);
}

for (const base of selected) {
  const comp = fpsOverride
    ? { ...base, fps: fpsOverride, durationInFrames: Math.round((base.durationInFrames / base.fps) * fpsOverride) }
    : base;
  const [id, length, format] = comp.id.split('-');
  const file = path.join(outDir, id, `DXOS_SI_${id}_${length}_${format}${variant}_v${version}.mp4`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  process.stdout.write(`Rendering ${comp.id} → ${path.relative(root, file)} `);
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: 'h264',
    outputLocation: file,
    inputProps,
    browserExecutable,
    chromiumOptions,
    onProgress: ({ progress }) => process.stdout.write(progress === 1 ? 'done\n' : ''),
  });
}
console.log(`\n${selected.length} file(s) in out/`);
