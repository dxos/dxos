//
// Copyright 2026 DXOS.org
//

// Regenerates AUDIT.md's inventory. Run: node .agents/projects/operation-keys/scan.mjs > /tmp/table.md
// The tool name is NOT recorded: it derives from the key by `Operation.toolName`, so restating it
// here would be a second implementation free to drift from the runtime.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const defFiles = execSync('grep -rl "Operation.make(" --include="*.ts" packages', { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'));

/** Package name and the path relative to its `src`, which is how a reader navigates to the file. */
const location = (file) => {
  let dir = path.dirname(file);
  while (dir !== '.' && dir !== '/') {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name;
      const rel = path.relative(path.join(dir, 'src'), file);
      return [pkg, rel.startsWith('..') ? path.relative(dir, file) : rel];
    } catch {
      dir = path.dirname(dir);
    }
  }
  return ['?', file];
};

// Identifiers named by a `Skill.toolDefinitions({ operations: [...] })`, resolved per package.
const wired = new Set();
for (const file of execSync('grep -rl "toolDefinitions(" --include="*.ts" packages', { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && !file.includes('/dist/'))) {
  const src = readFileSync(file, 'utf8');
  const [pkg] = location(file);
  for (const call of src.matchAll(/toolDefinitions\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    const inline = call[1].match(/operations:\s*\[([\s\S]*?)\]/);
    const named =
      call[1].match(/operations:\s*(\w+)/) ??
      (/[,{\s]operations\s*[,}]/.test(`{${call[1]}}`) ? [null, 'operations'] : null);
    const body =
      inline?.[1] ?? (named && src.match(new RegExp(`const ${named[1]}\\s*(?::[^=]+?)?=\\s*\\[([\\s\\S]*?)\\]`))?.[1]);
    for (const entry of (body ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)) {
      const parts = entry.split('.');
      const owner =
        parts.length > 1 ? (src.match(new RegExp(`import \\* as ${parts[0]} from '(@dxos/[\\w-]+)`))?.[1] ?? pkg) : pkg;
      wired.add(`${owner} ${parts.at(-1)}`);
    }
  }
}

const rows = [];
for (const file of defFiles) {
  const src = readFileSync(file, 'utf8');
  const [pkg, rel] = location(file);
  for (const match of src.matchAll(
    /(?:export\s+)?const\s+(\w+)\s*(?::[^=]+?)?=\s*Operation\.make(?:<[^>]*>)?\(\s*\{/g,
  )) {
    const rest = src.slice(match.index + match[0].length);
    const next = rest.search(/Operation\.make(?:<[^>]*>)?\(/);
    const meta = (next === -1 ? rest : rest.slice(0, next)).match(/meta:\s*\{(.*?)\n\s*\}/s);
    const key = meta?.[1].match(/key:\s*DXN\.make\(\s*'([^']+)'/)?.[1];
    if (!key) continue;
    rows.push({ key, pkg, rel, name: meta[1].match(/name:\s*'([^']+)'/)?.[1], wired: wired.has(`${pkg} ${match[1]}`) });
  }
}

// Production keys first, examples last; the table is read to find a real operation, and an
// alphabetical sort would bury 422 of them under `com.example`.
const rank = (key) => (key.startsWith('org.dxos.') ? 0 : key.startsWith('org.example.') ? 1 : 2);
rows.sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
const nonStandard = rows.filter(
  (row) =>
    !/^(org\.dxos|org\.example|com\.example)\.operation\.[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*$/.test(row.key),
);
console.log(
  `<!-- ${rows.length} operations, ${rows.filter((r) => r.wired).length} wired, ${nonStandard.length} off-shape -->`,
);
console.log('| DXN key | Package | File | `meta.name` | Skill |');
console.log('| --- | --- | --- | --- | --- |');
for (const row of rows) {
  console.log(`| \`${row.key}\` | \`${row.pkg}\` | \`${row.rel}\` | ${row.name ?? '—'} | ${row.wired ? '✓' : ''} |`);
}
