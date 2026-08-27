//
// Copyright 2026 DXOS.org
//

import { appendFileSync, readFileSync } from 'node:fs';

const MIN_REPORTED_BYTES = 1024;

const stripHash = (name) => name.replace(/-[A-Za-z0-9_-]{8}(\.[a-z]+)$/, '$1');

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const basePath = argValue('--base');
const headPath = argValue('--head');
if (!basePath || !headPath) {
  console.error('usage: compare-boot-budget.mjs --base <report.json> --head <report.json>');
  process.exit(1);
}

const base = JSON.parse(readFileSync(basePath, 'utf8'));
const head = JSON.parse(readFileSync(headPath, 'utf8'));

const asMb = (value) => `${(value / 1024 / 1024).toFixed(2)} MB`;
const asKb = (value) => `${(value / 1024).toFixed(1)} KB`;
const signed = (value, format) => `${value >= 0 ? '+' : '−'}${format(Math.abs(value))}`;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const bytesDelta = head.bytes - base.bytes;
const countDelta = head.count - base.count;
const increased = bytesDelta >= MIN_REPORTED_BYTES || countDelta > 0;

const sizeByName = (report) => new Map(report.entries.map((entry) => [stripHash(entry.name), entry.bytes]));
const baseSizes = sizeByName(base);
const headSizes = sizeByName(head);
const chunks = [...new Set([...baseSizes.keys(), ...headSizes.keys()])]
  .map((name) => ({ name, base: baseSizes.get(name), head: headSizes.get(name) }))
  .map((chunk) => ({ ...chunk, delta: (chunk.head ?? 0) - (chunk.base ?? 0) }))
  .filter((chunk) => Math.abs(chunk.delta) >= MIN_REPORTED_BYTES)
  .sort((first, second) => Math.abs(second.delta) - Math.abs(first.delta))
  .slice(0, 10);

const percent = base.bytes === 0 ? 0 : (bytesDelta / base.bytes) * 100;
const body = [
  '### 📦 Boot graph grew',
  '',
  'The eager boot graph (entry script + modulepreload closure) is larger than on the base commit.',
  'Advisory only — the gate is the budget in `check-boot-budget.mjs`.',
  '',
  '| | base | this PR | Δ | budget |',
  '| --- | ---: | ---: | ---: | ---: |',
  `| bytes | ${asMb(base.bytes)} | ${asMb(head.bytes)} | ${signed(bytesDelta, asKb)} (${signed(percent, (value) => `${value.toFixed(1)}%`)}) | ${asMb(head.budget.bytes)} |`,
  `| preload entries | ${base.count} | ${head.count} | ${countDelta === 0 ? '—' : signed(countDelta, String)} | ${head.budget.count} |`,
  '',
  `Headroom left: ${asMb(head.budget.bytes - head.bytes)} and ${plural(head.budget.count - head.count, 'entry', 'entries')}.`,
  ...(chunks.length > 0
    ? [
        '',
        '<details><summary>Chunks that moved</summary>',
        '',
        '| chunk | base | this PR | Δ |',
        '| --- | ---: | ---: | ---: |',
        ...chunks.map(
          (chunk) =>
            `| \`${chunk.name}\` | ${chunk.base === undefined ? '—' : asKb(chunk.base)} | ` +
            `${chunk.head === undefined ? '—' : asKb(chunk.head)} | ${signed(chunk.delta, asKb)} |`,
        ),
        '',
        '</details>',
      ]
    : []),
  '',
  'If this is a leak rather than accepted growth, the usual cause is a boot-reachable import',
  'reaching a package barrel instead of a light subpath (see the `dxos-subpath-imports` lint), or',
  'a plugin stub pulling its implementation instead of staying a `Plugin.lazy` stub.',
].join('\n');

console.log(
  `boot graph vs base: ${asMb(base.bytes)} -> ${asMb(head.bytes)} (${signed(bytesDelta, asKb)}), ` +
    `${base.count} -> ${head.count} entries`,
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `status=${increased ? 'grew' : 'unchanged'}\nbody<<BOOT_BUDGET_EOF\n${body}\nBOOT_BUDGET_EOF\n`,
  );
} else if (increased) {
  console.log(`\n${body}`);
}
