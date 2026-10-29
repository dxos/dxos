//
// Copyright 2026 DXOS.org
//

// Uploads the `cli:bundle` binaries, their checksums, `latest.json` and `install.sh` to the
// agent-artifacts R2 bucket, so a sandbox installs `dx` with one curl and no npm.
//
//   bun ./scripts/publish-r2.ts [--release] [--no-latest]
//
// --release publishes under the package version alone; otherwise the commit is appended.
// --no-latest leaves cli/latest.json and cli/install.sh as they are (snapshots).
//
// Needs R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (see the hosting-artifacts skill).

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const UPLOAD = '../../../.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs';

const TARGETS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64'] as const;

const upload = async (file: string, key: string, type: string) => {
  const proc = Bun.spawn(['node', UPLOAD, file, '--key', key, '--type', type], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await proc.exited) !== 0) {
    throw new Error(`Upload of ${key} failed.`);
  }
};

// Outside a release the commit is part of the version: one package version is built from many commits.
const { version: packageVersion } = await Bun.file('package.json').json();
const version = process.argv.includes('--release')
  ? packageVersion
  : `${packageVersion}-${(await Bun.$`git rev-parse --short HEAD`.text()).trim()}`;
const skipLatest = process.argv.includes('--no-latest');

const files: Record<string, { key: string; sha256: string }> = {};
const sums: string[] = [];
for (const target of TARGETS) {
  const ext = target.startsWith('win32') ? '.exe' : '';
  const binary = join('dist', `cli-${target}`, `dx${ext}`);
  if (!existsSync(binary)) {
    throw new Error(`Missing ${binary}; run \`moon run cli:bundle\` first.`);
  }
  const name = `dx-${target}${ext}`;
  const key = `cli/${version}/${name}`;
  const sha256 = createHash('sha256')
    .update(await readFile(binary))
    .digest('hex');
  console.log(`[publish-r2] ${key}`);
  await upload(binary, key, 'application/octet-stream');
  files[target] = { key, sha256 };
  sums.push(`${sha256}  ${name}`);
}

const staging = await mkdtemp(join(tmpdir(), 'dx-publish-'));
const sumsFile = join(staging, 'SHA256SUMS.txt');
await writeFile(sumsFile, `${sums.join('\n')}\n`);
await upload(sumsFile, `cli/${version}/SHA256SUMS`, 'text/plain');

// The installer is versioned with the binaries it fetches, so an old version stays installable.
await upload('scripts/install.sh', `cli/${version}/install.sh`, 'text/plain');

if (!skipLatest) {
  // One line, because install.sh reads the version with sed rather than requiring jq.
  const latestFile = join(staging, 'latest.json');
  await writeFile(latestFile, JSON.stringify({ version, files }));
  await upload(latestFile, 'cli/latest.json', 'application/json');
  await upload('scripts/install.sh', 'cli/install.sh', 'text/plain');
}

console.log(`[publish-r2] Published dx ${version}.`);
