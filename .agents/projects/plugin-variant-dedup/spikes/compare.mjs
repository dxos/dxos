#!/usr/bin/env node
// Compares each generated `capabilities/{node,workerd}.gen.ts` against the real hand-written
// barrel it stands in for, and classifies every divergence.

import fs from 'node:fs';
import path from 'node:path';

import { parseBarrel } from './lib/barrel.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO_PLUGINS = '/home/user/dxos/packages/plugins';

// Frozen snapshots, matching generate.mjs — see the note there on why (a concurrent session is
// live-editing plugin-markdown/plugin-space in this same worktree during this spike).
const TARGETS = [
  { plugin: 'plugin-markdown', handwrittenRoot: path.join(HERE, 'pristine-plugin-markdown') },
  { plugin: 'plugin-space', handwrittenRoot: path.join(HERE, 'pristine-plugin-space') },
  { plugin: 'plugin-thread', handwrittenRoot: path.join(HERE, 'pristine-plugin-thread') },
  { plugin: 'plugin-inbox', handwrittenRoot: path.join(HERE, 'pristine-plugin-inbox') },
];

const normalizeWs = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const isStub = (spec) => spec && spec.calleeText === null && spec.argsText === 'undefined';

const compareOne = ({ plugin, handwrittenRoot }) => {
  const results = {};
  for (const env of ['node', 'workerd']) {
    const genPath = path.join(HERE, 'generated', plugin, 'capabilities', `${env}.gen.ts`);
    const handPath = path.join(handwrittenRoot, 'src', 'capabilities', `${env}.ts`);
    if (!fs.existsSync(genPath) || !fs.existsSync(handPath)) continue;

    const gen = parseBarrel(genPath);
    const hand = parseBarrel(handPath);
    const allNames = new Set([...gen.keys(), ...hand.keys()]);

    const rows = [];
    for (const name of [...allNames].sort()) {
      const g = gen.get(name);
      const h = hand.get(name);
      if (!h) {
        rows.push({
          name,
          verdict: 'GENERATED_ONLY',
          detail: isStub(g)
            ? 'stub not present in handwritten (handwritten just omits it)'
            : 'real module not present in handwritten barrel',
        });
        continue;
      }
      if (!g) {
        rows.push({
          name,
          verdict: 'HANDWRITTEN_ONLY',
          detail:
            'handwritten exports this but the entry file for this env never references it (or it was excluded by the annotation source)',
        });
        continue;
      }
      if (isStub(g) && isStub(h)) {
        rows.push({ name, verdict: 'EQUIVALENT', detail: 'both stub as undefined' });
        continue;
      }
      if (isStub(g) !== isStub(h)) {
        rows.push({
          name,
          verdict: 'STUB_MISMATCH',
          detail: isStub(g)
            ? 'generated stubs it; handwritten gives it a real spec'
            : 'handwritten omits/stubs it; generated gives it a real spec',
        });
        continue;
      }
      const same =
        normalizeWs(g.calleeText) === normalizeWs(h.calleeText) && normalizeWs(g.argsText) === normalizeWs(h.argsText);
      rows.push({
        name,
        verdict: same ? 'EQUIVALENT' : 'SPEC_DIVERGES',
        detail: same
          ? `${g.calleeText}(...)`
          : `generated: ${g.calleeText}(${normalizeWs(g.argsText).slice(0, 100)}) | handwritten: ${h.calleeText}(${normalizeWs(h.argsText).slice(0, 100)})`,
      });
    }
    results[env] = rows;
  }
  return { plugin, results };
};

const report = TARGETS.map(compareOne);
fs.writeFileSync(path.join(HERE, 'generated', 'comparison-report.json'), JSON.stringify(report, null, 2));

for (const { plugin, results } of report) {
  console.log(`\n=== ${plugin} ===`);
  for (const [env, rows] of Object.entries(results)) {
    console.log(`  -- ${env} --`);
    for (const r of rows) console.log(`    [${r.verdict}] ${r.name}: ${r.detail}`);
  }
}
