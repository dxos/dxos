//
// Copyright 2026 DXOS.org
//

/**
 * Prints every `@feature` JSDoc tag in the TypeScript files git tracks as `{ "links": [...] }`, the input of the
 * `org.dxos.operation.projects.importFeatureLinks` operation. Tags that cannot name a feature go to stderr and make
 * the script exit 1.
 *
 * Usage: `bun packages/plugins/plugin-projects/scripts/scan-feature-links.ts [<path>...]`, from anywhere in the
 * repository; paths limit the scan to those directories.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as FeatureLink from '../src/types/FeatureLink.ts';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const paths = execFileSync(
  'git',
  // NUL-separated, since git quotes unusual paths in its line output; extensions are filtered below because
  // extra pathspecs would widen the scope rather than narrow it.
  ['ls-files', '-z', '--', ...(process.argv.length > 2 ? process.argv.slice(2) : ['.'])],
  { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
)
  .split('\0')
  .filter((path) => /\.tsx?$/.test(path));

const links: FeatureLink.Link[] = [];
const errors: FeatureLink.ScanError[] = [];
for (const path of paths) {
  const text = readFileSync(join(root, path), 'utf8');
  if (!text.includes('@feature')) {
    continue;
  }
  const result = FeatureLink.scan(path, text);
  links.push(...result.links);
  errors.push(...result.errors);
}

for (const { path, line, value, message } of errors) {
  process.stderr.write(`${path}:${line}: @feature ${value}: ${message}\n`);
}
process.stdout.write(`${JSON.stringify({ links }, null, 2)}\n`);
process.exitCode = errors.length > 0 ? 1 : 0;
