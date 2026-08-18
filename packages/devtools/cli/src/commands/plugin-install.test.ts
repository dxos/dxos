//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDx, withIsolatedHome } from '../testing';

/**
 * End-to-end subprocess tests for `dx plugin add` / `remove` against a fixture plugin — a
 * directory carrying a `manifest.json` and an entry module whose default export is the factory
 * `Plugin.make` produces, which is the shape a published third-party plugin ships.
 *
 * The URL cases run against a loopback server serving that same directory, so an install exercises
 * the real manifest fetch and asset download rather than a stub.
 */

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(dirname, '../../testing/fixture-plugin');
const FIXTURE_ID = 'com.example.plugin.fixture';
const MARKDOWN = 'org.dxos.plugin.markdown';

/** Each `dx` spawn costs several seconds from source; vitest's 15s default is below the multi-spawn cases. */
const TIMEOUT = 180_000;

type PluginRow = {
  id: string;
  enabled: boolean;
  core: boolean;
  source: 'builtin' | 'url' | 'dev';
  version?: string;
  failure?: string;
  status: string;
};

const listPlugins = (home: string): PluginRow[] => JSON.parse(runDx(['--json', 'plugin', 'list'], { home }).stdout);

const findFixture = (home: string) => listPlugins(home).find((row) => row.id === FIXTURE_ID);

const pluginsFile = (home: string) => path.join(home, '.config', 'dx', 'plugins', 'default.yml');
const installDir = (home: string) => path.join(home, '.config', 'dx', 'plugins', FIXTURE_ID);

/**
 * Serves the fixture directory on a loopback port for the duration of `fn`.
 *
 * The server runs in a child process because `runDx` spawns synchronously: an in-process server
 * could never answer the CLI's request, since the event loop that would serve it is blocked
 * waiting for the very subprocess making the request.
 */
const withFixtureServer = async <T>(fn: (baseUrl: string) => T): Promise<T> => {
  const source = `
    const http = require('node:http');
    const fs = require('node:fs');
    const path = require('node:path');
    const server = http.createServer((req, res) => {
      const file = path.join(${JSON.stringify(FIXTURE_DIR)}, path.basename(req.url || '/'));
      if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': 'application/octet-stream' }).end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => process.stdout.write(String(server.address().port) + '\\n'));
  `;
  const child = spawn(process.execPath, ['-e', source], { stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise<string>((resolve, reject) => {
    child.stdout.once('data', (chunk) => resolve(String(chunk).trim()));
    child.once('error', reject);
    child.once('exit', () => reject(new Error('fixture server exited before it was ready')));
  });
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    child.kill();
  }
};

describe('plugin add --dev', () => {
  test(
    'installs from a directory, reads it in place, and enables it',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, status } = runDx(['plugin', 'add', '--dev', FIXTURE_DIR], { home });
        expect(status).toBe(0);
        // The user typed a locator, so the resolved id is the useful output.
        expect(stdout).toContain(FIXTURE_ID);

        const row = findFixture(home);
        expect(row?.source).toBe('dev');
        expect(row?.enabled).toBe(true);
        // Loading a plugin installed from a path must actually work, not merely be recorded.
        expect(row?.failure).toBeUndefined();
        expect(row?.status).toBe('enabled');

        // A link is read in place, so nothing is copied under the CLI's own directory.
        expect(fs.existsSync(installDir(home))).toBe(false);
      });
    },
    TIMEOUT,
  );

  test(
    '--no-enable installs without running the plugin',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(runDx(['plugin', 'add', '--dev', FIXTURE_DIR, '--no-enable'], { home }).status).toBe(0);
        const row = findFixture(home);
        expect(row?.enabled).toBe(false);
        expect(row?.status).toBe('disabled');
      });
    },
    TIMEOUT,
  );

  test(
    'an installed plugin can be disabled and re-enabled like a builtin',
    ({ expect }) => {
      withIsolatedHome((home) => {
        runDx(['plugin', 'add', '--dev', FIXTURE_DIR], { home });
        expect(runDx(['plugin', 'disable', FIXTURE_ID], { home }).status).toBe(0);
        expect(findFixture(home)?.enabled).toBe(false);

        expect(runDx(['plugin', 'enable', FIXTURE_ID], { home }).status).toBe(0);
        const row = findFixture(home);
        expect(row?.enabled).toBe(true);
        // Disabling must not discard the install record.
        expect(row?.source).toBe('dev');
      });
    },
    TIMEOUT,
  );

  test(
    'a path without --dev is refused, naming the flag',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'add', FIXTURE_DIR], { home });
        expect(status).toBe(1);
        expect(stdout + stderr).toContain('--dev');
      });
    },
    TIMEOUT,
  );
});

describe('plugin add <url>', () => {
  test(
    'fetches the manifest, snapshots the assets, and records the version',
    async ({ expect }) => {
      await withFixtureServer(async (baseUrl) => {
        withIsolatedHome((home) => {
          const { status } = runDx(['plugin', 'add', `${baseUrl}/manifest.json`], { home });
          expect(status).toBe(0);

          // A copy owns bytes under the CLI's own directory, unlike a link.
          expect(fs.existsSync(path.join(installDir(home), 'index.mjs'))).toBe(true);

          const row = findFixture(home);
          expect(row?.source).toBe('url');
          expect(row?.version).toBe('1.2.3');
          // A snapshot lives outside any node_modules tree, so it only loads because the shared
          // scope serves its `@dxos/*` imports from the host. Without that it resolves a published
          // copy out of bun's install cache and fails.
          expect(row?.failure).toBeUndefined();
          expect(row?.status).toBe('enabled');
        });
      });
    },
    TIMEOUT,
  );

  test(
    'persists the manifest so the install is self-describing and works offline',
    async ({ expect }) => {
      const home = await withFixtureServer((baseUrl) => {
        const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-test-'));
        expect(runDx(['plugin', 'add', `${baseUrl}/manifest.json`], { home: isolated }).status).toBe(0);
        return isolated;
      });
      try {
        // The server is gone by now. A snapshot that needed the network to say what it is would be
        // useless offline, and could not be rebuilt if the profile's record were lost.
        expect(fs.existsSync(path.join(installDir(home), 'manifest.json'))).toBe(true);
        const row = findFixture(home);
        expect(row?.status).toBe('enabled');
        expect(row?.failure).toBeUndefined();
      } finally {
        fs.rmSync(home, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );

  test(
    'a URL with --dev is refused, naming what --dev expects',
    async ({ expect }) => {
      await withFixtureServer(async (baseUrl) => {
        withIsolatedHome((home) => {
          const { stdout, stderr, status } = runDx(['plugin', 'add', '--dev', `${baseUrl}/manifest.json`], { home });
          expect(status).toBe(1);
          expect(stdout + stderr).toContain('directory');
        });
      });
    },
    TIMEOUT,
  );
});

describe('plugin remove', () => {
  test(
    'deletes a copy but leaves a linked directory alone',
    ({ expect }) => {
      withIsolatedHome((home) => {
        runDx(['plugin', 'add', '--dev', FIXTURE_DIR], { home });
        expect(runDx(['plugin', 'remove', FIXTURE_ID], { home }).status).toBe(0);

        expect(findFixture(home)).toBeUndefined();
        expect(fs.readFileSync(pluginsFile(home), 'utf8')).not.toContain(FIXTURE_ID);
        // The user owns a linked directory; uninstalling must not delete their working copy.
        expect(fs.existsSync(path.join(FIXTURE_DIR, 'index.mjs'))).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    'refuses a compiled-in plugin and points at `disable`',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'remove', MARKDOWN], { home });
        expect(status).toBe(1);
        expect(stdout + stderr).toContain('disable');
      });
    },
    TIMEOUT,
  );

  test(
    'reports an unknown id rather than silently succeeding',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'remove', 'com.example.nope'], { home });
        expect(status).toBe(1);
        expect(stdout + stderr).toContain('not found');
      });
    },
    TIMEOUT,
  );
});

describe('a broken install', () => {
  test(
    'is reported by `plugin list` instead of taking down the CLI',
    ({ expect }) => {
      withIsolatedHome((home) => {
        runDx(['plugin', 'add', '--dev', FIXTURE_DIR], { home });
        // Point the record at a directory that no longer holds an entry module — the state a user
        // reaches by moving or deleting a linked checkout.
        const contents = fs.readFileSync(pluginsFile(home), 'utf8');
        fs.writeFileSync(pluginsFile(home), contents.replace(FIXTURE_DIR, path.join(home, 'gone')));

        // The plugin manager resolves lazy plugins inside its init chain, so an unhandled import
        // failure here would fail every command — including the ones needed to recover.
        const { status } = runDx(['--json', 'plugin', 'list'], { home });
        expect(status).toBe(0);

        const row = findFixture(home);
        expect(row?.status).toBe('failed');
        expect(row?.failure).toBeDefined();

        // And the user can still get out of it.
        expect(runDx(['plugin', 'remove', FIXTURE_ID], { home }).status).toBe(0);
      });
    },
    TIMEOUT,
  );
});
