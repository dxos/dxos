//
// Copyright 2026 DXOS.org
//

/**
 * Boot census: what code loads and executes in a Composer tab at ready + idle wave.
 *
 * Per loaded chunk: bytes loaded, bytes executed (Chrome precise coverage), and package
 * attribution via the chunk's sourcemap. Plus the app-framework module-activation list
 * (performance marks `module:<id>:*`) split into boot wave vs idle wave.
 *
 * Usage: node boot-census.mjs <url> <distDir> [--settle 150]
 */

import { chromium } from '@playwright/test';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173';
const distDir = process.argv[3];
if (!distDir || !existsSync(path.join(distDir, 'assets'))) {
  // Without the build's assets every chunk lookup misses and the census silently reports zeros.
  console.error(`no build at ${distDir ?? '<missing>'} — pass the dist directory, e.g. out/composer`);
  process.exit(1);
}
const settleIdx = process.argv.indexOf('--settle');
const settleS = settleIdx > 0 ? parseInt(process.argv[settleIdx + 1], 10) : 150;
const KB = (bytes) => +(bytes / 1024).toFixed(1);

const profileIdx = process.argv.indexOf('--profile');
const profileDir = profileIdx > 0 ? process.argv[profileIdx + 1] : null;
// A persistent profile keeps identity/storage across runs, which is the only way to measure a
// RETURNING tab (fresh contexts always re-run onboarding).
const context = profileDir
  ? await chromium.launchPersistentContext(profileDir, { headless: true })
  : await (await chromium.launch({ headless: true })).newContext();
const page = context.pages()[0] ?? (await context.newPage());
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
// Coverage must be armed before any script runs. Count mode (not detailed) keeps overhead low
// while still marking which functions executed.
await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: false });

console.error(`navigating ${url} ...`);
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });
const readyAt = Date.now();
console.error(`ready; settling ${settleS}s for the idle wave ...`);
await page.waitForTimeout(settleS * 1000);

// 1. Coverage: per-script executed ranges.
const { result: coverage } = await cdp.send('Profiler.takePreciseCoverage');

// 2. Page-side facts: loaded chunk list + module-activation marks + profiler snapshot.
const pageFacts = await page.evaluate(() => {
  const chunks = [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href.split('/').pop());
  const marks = performance
    .getEntriesByType('mark')
    .filter((m) => m.name.startsWith('module:'))
    .map((m) => ({ name: m.name, t: Math.round(m.startTime) }));
  const readyMark =
    performance.getEntriesByName('boot:react-ready')[0] ?? performance.getEntriesByName('boot:ready')[0];
  const snapshot = window.composer?.profiler?.snapshot?.() ?? null;
  return {
    chunks,
    marks,
    readyT: readyMark ? Math.round(readyMark.startTime) : null,
    moduleCount: snapshot?.moduleCount ?? null,
  };
});

await context.close();

// 3. Executed bytes per script URL (functions marked count>0; range 0 is the whole-script entry).
const execByUrl = new Map();
for (const script of coverage) {
  if (!script.url.startsWith('http')) {
    continue;
  }
  const name = script.url.split('/').pop().split('?')[0];
  let executed = 0;
  for (const fn of script.functions) {
    for (const range of fn.ranges) {
      if (range.count > 0) {
        executed += range.endOffset - range.startOffset;
      }
    }
  }
  // Ranges overlap (nesting); this overcounts slightly but consistently. Good enough for ranking.
  const cur = execByUrl.get(name) ?? 0;
  execByUrl.set(name, Math.max(cur, executed));
}

// 4. Chunk size + package attribution from sourcemaps.
const attributeChunk = (chunkName) => {
  const file = path.join(distDir, 'assets', chunkName);
  if (!existsSync(file)) {
    return null;
  }
  const size = statSync(file).size;
  const byPackage = new Map();
  const mapFile = `${file}.map`;
  if (existsSync(mapFile)) {
    try {
      const map = JSON.parse(readFileSync(mapFile, 'utf8'));
      const weights = new Map();
      let total = 0;
      (map.sources ?? []).forEach((src, i) => {
        const content = map.sourcesContent?.[i];
        const weight = content ? content.length : 1;
        let pkg;
        const nm = src.lastIndexOf('node_modules/');
        if (nm >= 0) {
          const rest = src.slice(nm + 'node_modules/'.length).replace(/^\.pnpm\/[^/]+\/node_modules\//, '');
          const parts = rest.split('/');
          pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
        } else {
          // Monorepo sources are relative from composer-app (../../../plugins/plugin-deck/src/…):
          // the leading ../ run lands at packages/; take the segment owning src|dist.
          const clean = src.replace(/^(\.\.\/)+/, '');
          const m = clean.match(
            /^(?:plugins|common|core|sdk|ui|devtools|tools|apps|experimental)\/(?:[a-z0-9-]+\/)*?([a-z0-9-]+)\/(?:src|dist)\//,
          );
          pkg = m ? `@dxos/${m[1]}` : '(app-shell)';
        }
        weights.set(pkg, (weights.get(pkg) ?? 0) + weight);
        total += weight;
      });
      for (const [pkg, weight] of weights) {
        byPackage.set(pkg, (weight / Math.max(1, total)) * size);
      }
    } catch {
      byPackage.set('(unmapped)', size);
    }
  } else {
    byPackage.set('(unmapped)', size);
  }
  return { size, byPackage };
};

const packages = new Map(); // pkg -> {loaded, executedApprox, chunks}
let totalLoaded = 0;
let totalExecuted = 0;
const deadChunks = [];
for (const chunk of pageFacts.chunks) {
  const info = attributeChunk(chunk);
  if (!info) {
    continue;
  }
  totalLoaded += info.size;
  const executed = execByUrl.get(chunk) ?? 0;
  totalExecuted += Math.min(executed, info.size);
  // Coverage ranges nest, so the summed bytes can exceed the chunk; the ratio is a share, not a sum.
  const ratio = info.size > 0 ? Math.min(1, executed / info.size) : 0;
  if (info.size > 20_000 && ratio < 0.02) {
    deadChunks.push({ chunk, size: info.size, ratio });
  }
  for (const [pkg, bytes] of info.byPackage) {
    const cur = packages.get(pkg) ?? { loaded: 0, executed: 0, chunks: 0 };
    cur.loaded += bytes;
    cur.executed += bytes * ratio;
    cur.chunks += 1;
    packages.set(pkg, cur);
  }
}

// 5. Module activation split: before ready vs after (idle wave).
const bootModules = [];
const idleModules = [];
for (const mark of pageFacts.marks) {
  const match = mark.name.match(/^module:(.+):start$/);
  if (!match) {
    continue;
  }
  (pageFacts.readyT != null && mark.t <= pageFacts.readyT ? bootModules : idleModules).push({
    id: match[1],
    t: mark.t,
  });
}

console.log(`# Boot census — ${url}`);
console.log(
  `chunks loaded: ${pageFacts.chunks.length}; bytes loaded: ${KB(totalLoaded)}KB; executed (approx): ${KB(totalExecuted)}KB (${((totalExecuted / Math.max(1, totalLoaded)) * 100).toFixed(0)}%)`,
);
console.log(
  `modules activated: boot wave ${bootModules.length}, idle wave ${idleModules.length} (profiler moduleCount: ${pageFacts.moduleCount})`,
);

console.log('\n## Top 40 packages by bytes loaded (executed%)');
for (const [pkg, { loaded, executed, chunks }] of [...packages.entries()]
  .sort((a, b) => b[1].loaded - a[1].loaded)
  .slice(0, 40)) {
  console.log(
    `  ${KB(loaded).toString().padStart(9)}KB  ${Math.round((executed / Math.max(1, loaded)) * 100)
      .toString()
      .padStart(3)}%  x${String(chunks).padStart(3)}  ${pkg}`,
  );
}

console.log('\n## Loaded chunks >20KB with <2% executed (dead weight candidates)');
for (const { chunk, size, ratio } of deadChunks.sort((a, b) => b.size - a.size).slice(0, 25)) {
  console.log(`  ${KB(size).toString().padStart(9)}KB  ${(ratio * 100).toFixed(1)}%  ${chunk}`);
}

console.log('\n## Idle-wave module activations (after ready)');
for (const m of idleModules.sort((a, b) => a.t - b.t).slice(0, 80)) {
  console.log(`  +${((m.t - (pageFacts.readyT ?? 0)) / 1000).toFixed(1)}s  ${m.id}`);
}

writeFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), 'boot-census.json'),
  JSON.stringify({ pageFacts, packages: [...packages.entries()], deadChunks, bootModules, idleModules }, null, 2),
);
console.error('\nwrote boot-census.json');
