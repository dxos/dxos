//
// Copyright 2026 DXOS.org
//

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves development fixtures pulled by `moon run fixtures:pull` — real, PII-bearing corpora that
 * live outside git in one shared directory at the repo root, so a corpus pulled once serves every
 * package's tests.
 *
 * A fixture is a NAME plus a UTC VERSION stamp (`inbox-20260804-181500.json`): pulls accumulate
 * rather than overwrite, so a result can be reproduced against the exact corpus that produced it.
 * Resolution defaults to the newest version; pass `{ version }` to pin one.
 *
 * Node-only (reads the filesystem). CI never has the credentials to pull a fixture, so every
 * consumer must gate on {@link fixtureExists} and skip; a test that depends on a private corpus
 * must not be able to fail the build.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** `YYYYMMDD-HHMMSS`, matching the stamp the CLI writes. */
const VERSION_RE = /^\d{8}-\d{6}$/;

export type FixtureOptions = {
  /** Pin an exact version (`20260804-181500`); defaults to the newest available. */
  readonly version?: string;
};

/** The shared fixture directory (git-ignored). Overridable for a scratch corpus. */
export const FIXTURES_DIR = process.env.DX_FIXTURES_DIR ?? join(REPO_ROOT, 'testing/fixtures');

/**
 * Versions of a fixture present locally, newest first. The stamp is lexicographically sortable, so
 * a plain string sort is chronological.
 */
export const fixtureVersions = (name: string): string[] => {
  if (!existsSync(FIXTURES_DIR)) {
    return [];
  }

  const prefix = `${name}-`;
  return readdirSync(FIXTURES_DIR)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith('.json'))
    .map((entry) => entry.slice(prefix.length, -'.json'.length))
    .filter((version) => VERSION_RE.test(version))
    .sort()
    .reverse();
};

/**
 * Absolute path of a fixture — the newest version, or the one pinned by `options.version`. Returns
 * `undefined` when no matching version has been pulled, so callers gate rather than handle a path
 * that does not exist.
 */
export const fixturePath = (name: string, options: FixtureOptions = {}): string | undefined => {
  const version = options.version ?? fixtureVersions(name)[0];
  if (!version) {
    return undefined;
  }

  const path = join(FIXTURES_DIR, `${name}-${version}.json`);
  return existsSync(path) ? path : undefined;
};

/**
 * Whether a fixture has been pulled. Gate every fixture-backed suite on this:
 * `describe.skipIf(!fixtureExists('inbox'))`.
 */
export const fixtureExists = (name: string, options: FixtureOptions = {}): boolean =>
  fixturePath(name, options) !== undefined;

/**
 * Parses a fixture. Throws when absent — callers gate on {@link fixtureExists} first, so an absent
 * fixture reaching here is a bug in the test rather than a missing pull.
 */
export const readFixture = <T = unknown>(name: string, options: FixtureOptions = {}): T[] => {
  const path = fixturePath(name, options);
  if (!path) {
    const pinned = options.version ? ` at version ${options.version}` : '';
    throw new Error(
      `Fixture "${name}"${pinned} not found in ${FIXTURES_DIR}. Pull it: moon run fixtures:pull -- ${name}`,
    );
  }

  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Fixture "${name}" is not an array: ${path}`);
  }

  return parsed as T[];
};
