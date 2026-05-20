//
// Copyright 2026 DXOS.org
//

// Integration test for `scripts/build-index.ts`: runs it against the fixture
// monorepo and asserts the emitted `plugins.json` sidecar carries the expected
// shape (version bump + non-empty idioms array sourced from `@idiom` tags).

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = resolve(__dirname, '__fixtures__');
const SCRIPT = resolve(__dirname, '..', 'scripts', 'build-index.ts');
const PLUGINS_PATH = join(FIXTURE_ROOT, 'node_modules', '.cache', 'dxos-introspect', 'plugins.json');

describe('build-index sidecar', { timeout: 60_000 }, () => {
  afterAll(() => {
    rmSync(join(FIXTURE_ROOT, 'node_modules', '.cache', 'dxos-introspect'), { recursive: true, force: true });
  });

  test('emits version >= 2 with an idioms array', ({ expect }) => {
    const result = spawnSync('pnpm', ['exec', 'tsx', '--conditions=source', SCRIPT, '--root', FIXTURE_ROOT], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);

    const sidecar = JSON.parse(readFileSync(PLUGINS_PATH, 'utf8'));
    expect(sidecar.version).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(sidecar.idioms)).toBe(true);
    // The pkg-a fixture defines a single `@idiom com.example.idiom.taskFactory`.
    expect(sidecar.idioms.length).toBeGreaterThanOrEqual(1);
    expect(sidecar.idioms.some((idiom: { slug: string }) => idiom.slug === 'com.example.idiom.taskFactory')).toBe(true);
  });
});
