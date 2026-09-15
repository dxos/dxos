//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDx, withIsolatedHome } from '../testing/index.ts';

/**
 * End-to-end subprocess tests for `dx plugin add` / `remove` against a fixture plugin — a directory
 * carrying a `manifest.json` and an entry module whose default export is the factory `Plugin.make`
 * produces, which is the shape a published third-party plugin ships.
 *
 * The URL cases run against a loopback server serving that same directory, so an install exercises
 * the real manifest fetch and asset download rather than a stub. Every `dx` spawn costs a few
 * seconds, so each test drives one flow to its end rather than spending a process per assertion.
 */

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(dirname, '../../testing/fixture-plugin');
const FIXTURE_ID = 'com.example.plugin.fixture';
const MARKDOWN = 'org.dxos.plugin.markdown';

/** ~5s per `dx` spawn from source; the longest flow here spawns five times. */
const TIMEOUT = 60_000;

type PluginRow = {
  id: string;
  enabled: boolean;
  core: boolean;
  source: 'builtin' | 'url' | 'dev';
  version?: string;
  failure?: string;
  status: string;
};

describe('plugin add --dev', () => {
  test(
    'reads a directory in place, loads it, and behaves like a builtin under disable/enable',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, status } = runDx(['plugin', 'add', '--dev', '--yes', FIXTURE_DIR], { home });
        expect(status).toBe(0);
        // The user typed a locator, so the resolved id is the useful output.
        expect(stdout).toContain(FIXTURE_ID);

        const installed = findFixture(home);
        expect(installed?.source).toBe('dev');
        expect(installed?.enabled).toBe(true);
        // Loading must actually work, not merely be recorded.
        expect(installed?.failure).toBeUndefined();
        expect(installed?.status).toBe('enabled');
        // A link is read in place, so nothing is copied under the CLI's own directory.
        expect(fs.existsSync(path.join(home, '.config', 'dx', 'plugins', FIXTURE_ID))).toBe(false);

        expect(runDx(['plugin', 'disable', FIXTURE_ID], { home }).status).toBe(0);
        const disabled = findFixture(home);
        expect(disabled?.enabled).toBe(false);
        // Disabling must not discard the install record.
        expect(disabled?.source).toBe('dev');

        expect(runDx(['plugin', 'enable', FIXTURE_ID], { home }).status).toBe(0);
      });
    },
    TIMEOUT,
  );

  // With no terminal to prompt, consent has to be refusal — a script must say `--yes`.
  test(
    'refuses to install without confirmation, naming --yes',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'add', '--dev', FIXTURE_DIR], { home });
        expect(status).not.toBe(0);
        expect(stdout + stderr).toContain('--yes');
        // Refusal has to leave nothing behind, or the next command loads code never consented to.
        expect(findFixture(home)).toBeUndefined();
      });
    },
    TIMEOUT,
  );

  test(
    '--no-enable records the plugin without activating it',
    ({ expect }) => {
      withIsolatedHome((home) => {
        // The fixture ships a built `manifest.json`, so only its metadata is read.
        expect(runDx(['plugin', 'add', '--dev', '--yes', FIXTURE_DIR, '--no-enable'], { home }).status).toBe(0);
        const row = findFixture(home);
        expect(row?.enabled).toBe(false);
        expect(row?.status).toBe('disabled');
      });
    },
    TIMEOUT,
  );
});

describe('plugin add <url>', () => {
  test(
    'snapshots the bundle and its manifest, loads offline, and is deleted by remove',
    async ({ expect }) => {
      const home = await withFixtureServer((baseUrl) => {
        const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-test-'));
        // `--dev` means "read in place", which a URL cannot satisfy.
        const dev = runDx(['plugin', 'add', '--dev', '--yes', `${baseUrl}/manifest.json`], { home: isolated });
        expect(dev.status).toBe(1);
        expect(dev.stdout + dev.stderr).toContain('directory');

        // An asset naming another host would make `add` fetch somewhere the user never named.
        const hostile = runDx(['plugin', 'add', '--yes', `${baseUrl}/hostile-manifest.json`], { home: isolated });
        expect(hostile.status).toBe(1);
        expect(hostile.stdout + hostile.stderr).toContain('origin');
        expect(fs.existsSync(path.join(isolated, '.config', 'dx', 'plugins', 'com.example.plugin.hostile'))).toBe(
          false,
        );

        // `..%5C` survives URL normalization and is a separator once decoded on Windows.
        const traversal = runDx(['plugin', 'add', '--yes', `${baseUrl}/traversal-manifest.json`], { home: isolated });
        expect(traversal.status).toBe(1);
        expect(traversal.stdout + traversal.stderr).toContain('below its manifest');

        expect(runDx(['plugin', 'add', '--yes', `${baseUrl}/manifest.json`], { home: isolated }).status).toBe(0);
        return isolated;
      });

      try {
        // The server is gone by this point. A snapshot that needed the network to say what it is
        // would be useless offline, and could not be rebuilt if the profile's record were lost.
        expect(fs.existsSync(path.join(path.join(home, '.config', 'dx', 'plugins', FIXTURE_ID), 'index.mjs'))).toBe(
          true,
        );
        expect(fs.existsSync(path.join(path.join(home, '.config', 'dx', 'plugins', FIXTURE_ID), 'manifest.json'))).toBe(
          true,
        );

        const row = findFixture(home);
        expect(row?.source).toBe('url');
        expect(row?.version).toBe('1.2.3');
        // A snapshot lives outside any node_modules tree, so it only loads because the shared scope
        // serves its `@dxos/*` imports from the host.
        expect(row?.failure).toBeUndefined();
        expect(row?.status).toBe('enabled');

        expect(runDx(['plugin', 'remove', FIXTURE_ID], { home }).status).toBe(0);
        // A copy is the CLI's to delete, unlike a linked directory.
        expect(fs.existsSync(path.join(home, '.config', 'dx', 'plugins', FIXTURE_ID))).toBe(false);
      } finally {
        fs.rmSync(home, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});

describe('plugin remove', () => {
  test(
    'forgets a link without touching it, and refuses a builtin, an unknown id, or a bare path',
    ({ expect }) => {
      withIsolatedHome((home) => {
        runDx(['plugin', 'add', '--dev', '--yes', FIXTURE_DIR], { home });
        expect(runDx(['plugin', 'remove', FIXTURE_ID], { home }).status).toBe(0);
        expect(fs.readFileSync(path.join(home, '.config', 'dx', 'plugins', 'default.yml'), 'utf8')).not.toContain(
          FIXTURE_ID,
        );
        // The user owns a linked directory; uninstalling must not delete their working copy.
        expect(fs.existsSync(path.join(FIXTURE_DIR, 'index.mjs'))).toBe(true);

        const builtin = runDx(['plugin', 'remove', MARKDOWN], { home });
        expect(builtin.status).toBe(1);
        expect(builtin.stdout + builtin.stderr).toContain('disable');

        const unknown = runDx(['plugin', 'remove', 'com.example.nope'], { home });
        expect(unknown.status).toBe(1);
        expect(unknown.stdout + unknown.stderr).toContain('not found');

        // Installing from a path without `--dev` would have to snapshot it, which is not supported.
        const bare = runDx(['plugin', 'add', '--yes', FIXTURE_DIR], { home });
        expect(bare.status).toBe(1);
        expect(bare.stdout + bare.stderr).toContain('--dev');
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
        runDx(['plugin', 'add', '--dev', '--yes', FIXTURE_DIR], { home });
        // Point the record at a directory that no longer holds an entry module — the state a user
        // reaches by moving or deleting a linked checkout.
        const contents = fs.readFileSync(path.join(home, '.config', 'dx', 'plugins', 'default.yml'), 'utf8');
        fs.writeFileSync(
          path.join(home, '.config', 'dx', 'plugins', 'default.yml'),
          contents.replace(FIXTURE_DIR, path.join(home, 'gone')),
        );

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

const listPlugins = (home: string): PluginRow[] => JSON.parse(runDx(['--json', 'plugin', 'list'], { home }).stdout);

const findFixture = (home: string) => listPlugins(home).find((row) => row.id === FIXTURE_ID);

/**
 * Serves the fixture directory on a loopback port for the duration of `fn`.
 *
 * The server runs in a child process because `runDx` spawns synchronously, so an in-process server
 * would be blocked by the very subprocess making the request.
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
