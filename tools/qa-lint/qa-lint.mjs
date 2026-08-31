// Lints `flow QA-n` blocks for references the flow never binds.
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('packages/plugins/*/PLUGIN.mdl').sort();
const report = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  // Slice each `flow QA-n:` block: starts at the header, ends at the closing fence.
  const flows = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^flow QA-\d+:/.test(lines[i])) {
      cur = { name: lines[i].match(/^flow (QA-\d+)/)[1], start: i + 1, body: [] };
      flows.push(cur);
      continue;
    }
    if (cur) {
      if (/^```/.test(lines[i])) {
        cur = null;
        continue;
      }
      cur.body.push({ n: i + 1, text: lines[i] });
    }
  }

  for (const flow of flows) {
    const text = flow.body.map((l) => l.text).join('\n');

    // Bound names: `given:` entries written `- name: prose`, and every `capture:`.
    const givens = new Set();
    let inGiven = false;
    for (const { text: l } of flow.body) {
      if (/^\s{2}given:/.test(l)) {
        inGiven = true;
        continue;
      }
      if (/^\s{2}\w+[?]?:/.test(l)) inGiven = false;
      if (inGiven) {
        const m = l.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):\s/);
        if (m) givens.add(m[1]);
      }
    }
    const captures = new Set([...text.matchAll(/^\s*capture:\s*([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]));

    // Referenced names.
    const seen = new Map();
    for (const { n, text: l } of flow.body) {
      for (const m of l.matchAll(/\$given\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (!givens.has(m[1])) seen.set(`$given.${m[1]}`, n);
      }
      for (const m of l.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
        const name = m[1];
        if (['given', 'result', 'error', 'spaceId'].includes(name)) continue;
        if (!captures.has(name)) seen.set(`$${name}`, n);
      }
    }
    if (seen.size) {
      report.push({ file, flow: flow.name, unbound: [...seen.entries()] });
    }
  }
}

let total = 0;
for (const r of report) {
  console.log(`${r.file}  ${r.flow}`);
  for (const [name, line] of r.unbound) {
    console.log(`    L${line}  ${name}`);
    total++;
  }
}
console.log(`\n${report.length} flows with unbound references; ${total} references total`);

// Non-zero exit so CI and hooks fail on a bad manifest without parsing stdout.
if (total > 0) {
  process.exitCode = 1;
}
