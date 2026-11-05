//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The agents fixture holding the canary identity's client profile: one device whose state was exported once and is
 * unpacked fresh every run, so the identity does not gain a device each night and EDGE replicates only what changed
 * since the export.
 */
export const PROFILE_FIXTURE = 'mail-canary-profile';
export const PROFILE_EXTENSION = 'tgz';

/** Unpacks the profile into a new directory and returns it, so the fixture itself stays as exported. */
export const unpackProfile = (archive: string): string => {
  const dataRoot = mkdtempSync(join(tmpdir(), `${PROFILE_FIXTURE}-`));
  execFileSync('tar', ['-xzf', archive, '-C', dataRoot]);
  return dataRoot;
};

/** Packs a client's data root into `<outDir>/mail-canary-profile-<stamp>.tgz`, named as `fixtures push` expects. */
export const packProfile = (dataRoot: string, outDir: string, now = new Date()): string => {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\..*$/, '');
  const archive = join(outDir, `${PROFILE_FIXTURE}-${stamp}.${PROFILE_EXTENSION}`);
  execFileSync('tar', ['-czf', archive, '-C', dataRoot, '.']);
  return archive;
};
