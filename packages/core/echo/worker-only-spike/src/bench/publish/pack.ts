//
// Copyright 2026 DXOS.org
//

// Whether @dxos/automerge-proxy is ready to publish: packs it, checks the manifest and that every export
// target is in the tarball, then imports the packed build through its exports as an npm consumer would.
// Build first (`moon run automerge-proxy:build`).
// Usage: node src/bench/publish/pack.ts <scratch dir>

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const scratch = process.argv[2];
const packageDir = join(import.meta.dirname, '../../../../automerge-proxy');
rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', scratch], { cwd: packageDir, stdio: 'ignore' });
const tarball = execFileSync('ls', [scratch]).toString().trim();
execFileSync('tar', ['-xzf', join(scratch, tarball), '-C', scratch]);

const manifest = JSON.parse(readFileSync(join(scratch, 'package/package.json'), 'utf8'));
const targets = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : typeof value === 'object' && value !== null
      ? Object.values(value).flatMap(targets)
      : [];
const missing = Object.entries(manifest.exports).flatMap(([key, value]) =>
  targets(value)
    .filter((target) => !existsSync(join(scratch, 'package', target)))
    .map((target) => `${key} -> ${target}`),
);
const unresolved = Object.entries(manifest.dependencies ?? {}).filter(([, version]) => String(version).includes(':'));
console.log(
  `${tarball}: private ${Boolean(manifest.private)}, missing export targets ${missing.length}, unresolved specifiers ${unresolved.length}`,
);

// A consumer's node_modules: the packed package, with its dependencies from the workspace.
const consumer = join(scratch, 'consumer');
const install = (name: string, target: string) => {
  const link = join(consumer, 'node_modules', name);
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(target, link);
};
// A copy, not a link: Node resolves a link to its real path, and the package's own imports would miss the consumer's.
mkdirSync(join(consumer, 'node_modules/@dxos'), { recursive: true });
cpSync(join(scratch, 'package'), join(consumer, 'node_modules/@dxos/automerge-proxy'), { recursive: true });
for (const name of Object.keys(manifest.dependencies ?? {})) {
  install(
    name,
    execFileSync('readlink', ['-f', join(packageDir, 'node_modules', name)])
      .toString()
      .trim(),
  );
}
writeFileSync(
  join(consumer, 'smoke.mjs'),
  [
    "import * as Draft from '@dxos/automerge-proxy/Draft';",
    "import * as Namespace from '@dxos/automerge-proxy/Automerge';",
    "const recorder = new Draft.Recorder({ title: 'packed', tags: [] });",
    'const draft = recorder.draft();',
    "draft.title = 'from the tarball';",
    "draft.tags.push('ok');",
    'console.log(JSON.stringify(recorder.ops), typeof Namespace.getHeads);',
  ].join('\n'),
);
console.log(execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer }).toString().trim());
