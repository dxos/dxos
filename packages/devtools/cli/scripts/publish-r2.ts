//
// Copyright 2026 DXOS.org
//

// Uploads the `cli:bundle` binaries, their checksums, `latest.json` and `install.sh` to the
// agent-artifacts R2 bucket, so a sandbox installs `dx` with one curl and no npm.
//
//   bun ./scripts/publish-r2.ts [--release]
//
// --release publishes under the package version alone, skips a version already published, and moves
// cli/latest.json and cli/install.sh. Without it the commit is appended and latest is left alone.
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
const release = process.argv.includes('--release');
const { version: packageVersion } = await Bun.file('package.json').json();
const version = release
  ? packageVersion
  : `${packageVersion}-${(await Bun.$`git rev-parse --short HEAD`.text()).trim()}`;

// A release key is immutable: npm skips a version it already has, so overwriting it here would make
// the same version mean different binaries on npm and R2. SHA256SUMS is written last, so its presence
// means the version's files are complete; a retry then only finishes promoting it.
const publicBase = process.env.R2_PUBLIC_BASE || 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev';
const sumsUrl = `${publicBase}/cli/${version}/SHA256SUMS`;
const probe = release ? await fetch(sumsUrl, { method: 'HEAD' }) : undefined;
// Only a 404 means unpublished: guessing on a 5xx could overwrite a release.
if (probe && !probe.ok && probe.status !== 404) {
  throw new Error(`Checking ${sumsUrl} failed (${probe.status}).`);
}
const published = probe?.ok ?? false;

const files: Record<string, { key: string; sha256: string }> = {};
const staging = await mkdtemp(join(tmpdir(), 'dx-publish-'));

if (published) {
  console.log(`[publish-r2] dx ${version} is already published; leaving its files as they are.`);
  const response = await fetch(sumsUrl);
  if (!response.ok) {
    throw new Error(`Reading ${sumsUrl} failed (${response.status}).`);
  }
  for (const line of (await response.text()).trim().split('\n')) {
    const match = line.match(/^([0-9a-f]{64})\s+(dx-([a-z0-9]+-[a-z0-9]+)(?:\.exe)?)$/);
    if (!match) {
      throw new Error(`Unexpected line in ${sumsUrl}: ${line}`);
    }
    const [, sha256, name, target] = match;
    files[target] = { key: `cli/${version}/${name}`, sha256 };
  }
  const missing = TARGETS.filter((target) => !files[target]);
  if (missing.length > 0) {
    throw new Error(`${sumsUrl} has no checksum for ${missing.join(', ')}.`);
  }
} else {
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

  // The installer is versioned with the binaries it fetches, so an old version stays installable.
  await upload('scripts/install.sh', `cli/${version}/install.sh`, 'text/plain');

  const sumsFile = join(staging, 'SHA256SUMS.txt');
  await writeFile(sumsFile, `${sums.join('\n')}\n`);
  await upload(sumsFile, `cli/${version}/SHA256SUMS`, 'text/plain');
}

if (release) {
  // One line, because install.sh reads the version with sed rather than requiring jq.
  const latestFile = join(staging, 'latest.json');
  await writeFile(latestFile, JSON.stringify({ version, files }));
  await upload(latestFile, 'cli/latest.json', 'application/json');
  await upload('scripts/install.sh', 'cli/install.sh', 'text/plain');
}

console.log(`[publish-r2] Published dx ${version}.`);
