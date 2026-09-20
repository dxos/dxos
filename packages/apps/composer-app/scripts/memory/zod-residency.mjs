//
// Which chunks actually LOAD and EXECUTE in a Composer tab, resolved to the packages inside them.
//
// boot-census.mjs attributes only the modulepreload set; the MCP SDK chunk is not preloaded, so
// answering "did zod run at boot?" needs every script V8 saw, not the preload list.
//
// Usage: node zod-residency.mjs <url> <distDir> [--settle 150] [--match zod,modelcontextprotocol]
//

import { chromium } from '@playwright/test';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173';
const distDir = process.argv[3];
if (!distDir || !existsSync(path.join(distDir, 'assets'))) {
  console.error(`no build at ${distDir ?? '<missing>'} — pass the dist directory, e.g. out/composer`);
  process.exit(1);
}
const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const settleS = parseInt(arg('--settle', '150'), 10);
const needles = arg('--match', 'zod,modelcontextprotocol').split(',');
const out = arg('--out', 'zod-residency.json');
const KB = (b) => +(b / 1024).toFixed(1);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: false });

console.error(`navigating ${url} ...`);
await page.goto(url, { timeout: 180_000 });
await page.getByTestId('treeView.userAccount').waitFor({ timeout: 180_000 });
console.error(`ready; settling ${settleS}s ...`);
await page.waitForTimeout(settleS * 1000);

const { result: coverage } = await cdp.send('Profiler.takePreciseCoverage');
const preloaded = new Set(
  await page.evaluate(() =>
    [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href.split('/').pop()),
  ),
);
await browser.close();

// Executed bytes per script (ranges nest, so this over-counts consistently; used only as a ratio).
const execByName = new Map();
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
  execByName.set(name, Math.max(execByName.get(name) ?? 0, executed));
}

// Which of the needles a chunk's sourcemap names, and how much of the chunk they weigh.
const inspect = (name) => {
  const file = path.join(distDir, 'assets', name);
  if (!existsSync(file)) {
    return null;
  }
  const size = statSync(file).size;
  const mapFile = `${file}.map`;
  if (!existsSync(mapFile)) {
    return { size, hits: new Map(), sources: 0 };
  }
  const map = JSON.parse(readFileSync(mapFile, 'utf8'));
  const sources = map.sources ?? [];
  const total = sources.reduce((acc, _, i) => acc + (map.sourcesContent?.[i]?.length ?? 1), 0);
  const hits = new Map();
  sources.forEach((src, i) => {
    const weight = map.sourcesContent?.[i]?.length ?? 1;
    for (const needle of needles) {
      if (src.includes(needle)) {
        const cur = hits.get(needle) ?? { files: 0, bytes: 0 };
        cur.files += 1;
        cur.bytes += (weight / Math.max(1, total)) * size;
        hits.set(needle, cur);
      }
    }
  });
  return { size, hits, sources: sources.length };
};

const rows = [];
for (const [name, executed] of execByName) {
  const info = inspect(name);
  if (!info || info.hits.size === 0) {
    continue;
  }
  rows.push({
    chunk: name,
    size: info.size,
    executed,
    ratio: info.size > 0 ? Math.min(1, executed / info.size) : 0,
    preloaded: preloaded.has(name),
    sources: info.sources,
    hits: [...info.hits.entries()].map(([needle, v]) => ({ needle, files: v.files, bytes: Math.round(v.bytes) })),
  });
}
rows.sort((a, b) => b.size - a.size);

console.log(`# Residency of [${needles.join(', ')}] — ${url}, settle ${settleS}s`);
console.log(`scripts executed: ${execByName.size}; matching chunks LOADED: ${rows.length}`);
if (rows.length === 0) {
  console.log('\nNone of the matched packages are in any loaded chunk.');
}
for (const r of rows) {
  const attributed = r.hits.map((h) => `${h.needle}: ${h.files} files, ~${KB(h.bytes)}KB`).join('; ');
  console.log(
    `\n  ${r.chunk}\n    chunk ${KB(r.size)}KB, ${r.sources} sources, executed ~${(r.ratio * 100).toFixed(0)}%` +
      `, preloaded=${r.preloaded}\n    ${attributed}`,
  );
}
writeFileSync(out, JSON.stringify({ url, settleS, needles, rows, scriptCount: execByName.size }, null, 2));
console.error(`\nwrote ${out}`);
