#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Exports the mail canary identity's client profile and uploads it as the encrypted `mail-canary-profile` agents
 * fixture, which every canary run unpacks and opens (README.md, Setup step 4).
 *
 * Why: a run that recovers the identity adds a device to it, every night. A run that opens the profile is the same
 * device each time, and EDGE replicates to it only what changed since the export, the canary's own writes included.
 *
 * When to run it:
 * - once, to create the profile;
 * - when catching up from it gets slow, that is when the canary's first read of its space creeps toward
 *   `edge.readMinutes` in canary.yml, because the export has fallen far behind EDGE;
 * - when the fixture is missing, which shows as runs logging `signed in { profile: false }`.
 *
 * Each export adds one device to the identity. Run it while the nightly canary is not running (03:17 UTC), from a
 * machine whose client keeps a live connection to preview EDGE; a connection that drops stalls the export, which then
 * fails after `edge.openMinutes` + `edge.readMinutes`.
 *
 * Needs DX_CANARY_RECOVERY_PHRASE (from canary.env.tpl), DX_FIXTURES_AGE_KEY (your own key: the push encrypts to the
 * agents key too) and wrangler access to the `test-fixtures` R2 bucket. From the repo root:
 *
 *   op run --env-file packages/plugins/plugin-google/canary/canary.env.tpl -- \
 *     node packages/plugins/plugin-google/canary/upload-profile.mjs
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANARY_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CANARY_DIR, '../../../..');
const OUT_DIR = join(CANARY_DIR, 'out');

/** Archives the export left in `out/`; each holds a device's private key. */
const archives = () => {
  try {
    return readdirSync(OUT_DIR).filter((name) => name.startsWith('mail-canary-profile-') && name.endsWith('.tgz'));
  } catch {
    return [];
  }
};

const removeArchives = () => {
  for (const name of archives()) {
    rmSync(join(OUT_DIR, name));
  }
};

const run = (command, args) => execFileSync(command, args, { cwd: REPO_ROOT, stdio: 'inherit' });

if (!process.env.DX_CANARY_RECOVERY_PHRASE) {
  console.error('set DX_CANARY_RECOVERY_PHRASE, e.g. with `op run --env-file .../canary/canary.env.tpl --`');
  process.exit(1);
}

// An archive left by an earlier export would be uploaded in place of this one.
removeArchives();
try {
  run('moon', ['run', 'plugin-google:mail-canary-profile']);
  const [archive] = archives();
  if (!archive) {
    throw new Error('the export wrote no archive');
  }
  run('node', ['tools/fixtures/bin/fixtures.mjs', 'push', join(OUT_DIR, archive), '--scope', 'agents']);
  console.log(`uploaded ${archive}; the next canary run opens it`);
} finally {
  // Only the encrypted fixture should outlive the upload.
  removeArchives();
}
