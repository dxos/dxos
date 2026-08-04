//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves development fixtures pulled by `moon run fixtures:pull` — real, PII-bearing corpora that
 * live outside git in one shared directory at the repo root, so a corpus pulled once serves every
 * package's tests.
 *
 * Node-only (reads the filesystem). CI never has the credentials to pull one, so every consumer
 * must gate on {@link fixtureExists} and skip; a test that depends on a private corpus must not be
 * able to fail the build.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** The shared fixture directory (git-ignored). Overridable for a scratch corpus. */
export const FIXTURES_DIR = process.env.DX_FIXTURES_DIR ?? join(REPO_ROOT, 'testing/fixtures');

/** Absolute path of a named fixture, e.g. `fixturePath('inbox')`. Does not check existence. */
export const fixturePath = (name: string): string => join(FIXTURES_DIR, `${name}.json`);

/**
 * Whether a named fixture has been pulled. Gate every fixture-backed suite on this:
 * `describe.skipIf(!fixtureExists('inbox'))`.
 */
export const fixtureExists = (name: string): boolean => existsSync(fixturePath(name));

/**
 * Parses a named fixture. Throws when absent — callers gate on {@link fixtureExists} first, so an
 * absent fixture reaching here is a bug in the test rather than a missing pull.
 */
export const readFixture = <T = unknown>(name: string): T[] => {
  const path = fixturePath(name);
  if (!existsSync(path)) {
    throw new Error(`Fixture "${name}" not found at ${path}. Pull it: moon run fixtures:pull -- ${name}`);
  }

  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Fixture "${name}" is not an array: ${path}`);
  }

  return parsed as T[];
};
