// Flags `after:` steps that could remove an object the run did not create.
//
// A teardown is safe when it removes something the flow bound itself (a `capture:` or a named
// `given:`), or resolves by a name the flow's `given` guarantees is absent and throws when that
// name is missing. Resolving by type-and-index can delete whatever the space happens to hold.
import { readFileSync, globSync } from 'node:fs';

let unsafe = 0;
for (const file of globSync('packages/plugins/*/PLUGIN.mdl').sort()) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let inAfter = false;
  let flow = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^flow QA-\d+:/.test(line)) {
      flow = line.match(/^flow (QA-\d+)/)[1];
      inAfter = false;
    }
    if (/^  after:/.test(line)) {
      inAfter = true;
      continue;
    }
    if (/^  (test|before|given):/.test(line) || line.startsWith('```')) {
      inAfter = false;
    }
    if (!inAfter || !/removeObjects/.test(line)) {
      continue;
    }
    // Only the invoke's own continuation lines — an `assert:` verifying removal legitimately
    // queries the database and must not be mistaken for victim selection.
    const step = [];
    for (let j = i; j < lines.length; j++) {
      if (j > i && /^\s+(assert|expect|note|do|name|capture):/.test(lines[j])) break;
      step.push(lines[j]);
    }
    if (!/db\.query/.test(step.join('\n'))) {
      continue; // removes a bound value.
    }
    const byIndex = /\.objects\[\d+\]/.test(step.join('\n'));
    const guarded = /throw new Error/.test(step.join('\n'));
    if (byIndex || !guarded) {
      console.log(`${file}  ${flow}  L${i + 1}  ${byIndex ? 'resolves by index' : 'unguarded query'}`);
      unsafe++;
    }
  }
}
console.log(`\n${unsafe} teardown step(s) that could remove an object the run did not create`);

// Non-zero exit so CI and hooks fail on a bad manifest without parsing stdout.
if (unsafe > 0) {
  process.exitCode = 1;
}
