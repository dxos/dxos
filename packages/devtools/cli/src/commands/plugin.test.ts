//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runDx, withIsolatedHome } from '../testing/index.ts';
import { getCore, getDefaults } from './plugin-defs.ts';

/**
 * End-to-end subprocess tests for `dx plugin`. Each runs against a throwaway HOME so the profile
 * starts unconfigured, which is the state the default set is for.
 *
 * Every `dx` spawn costs a few seconds, so these are grouped by flow and assert richly within one
 * rather than spending a process per assertion.
 */

const CLIENT = 'org.dxos.plugin.client';
const MARKDOWN = 'org.dxos.plugin.markdown';
const SAMPLE = 'org.dxos.plugin.sample';

/** ~5s per `dx` spawn from source; the longest flow here spawns five times. */
const TIMEOUT = 60_000;

type PluginRow = {
  id: string;
  name: string;
  installed: boolean;
  enabled: boolean;
  core: boolean;
  status: string;
  failure?: string;
};

describe('plugin list', () => {
  test(
    'reports both axes, the CLI-owned core set, and the default enabled set',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const rows = listPlugins(home);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(typeof row.id).toBe('string');
          expect(row.installed).toBe(true);
          expect(typeof row.enabled).toBe('boolean');
          expect(typeof row.core).toBe('boolean');
        }

        // The axes are genuinely independent — the demos ship with the binary and stay off — which
        // the collapsed single-status output could not express.
        const sample = rows.find((row) => row.id === SAMPLE);
        expect(sample?.installed).toBe(true);
        expect(sample?.enabled).toBe(false);

        const core = rows.filter((row) => row.core).map((row) => row.id);
        expect(core.toSorted()).toEqual(getCore().toSorted());
        // Regression guard for the inherited-tagging defect: these three declare `system` in their
        // own `dx.config.ts` for Composer's benefit, and must stay disableable in the CLI.
        for (const id of ['org.dxos.plugin.observability', 'org.dxos.plugin.connector', 'org.dxos.plugin.routine']) {
          expect(core).not.toContain(id);
        }

        const enabled = rows.filter((row) => row.enabled).map((row) => row.id);
        expect(enabled.toSorted()).toEqual([...getDefaults(), ...getCore()].toSorted());

        const filtered = listPlugins(home, ['--enabled']);
        expect(filtered.map((row) => row.id).toSorted()).toEqual(enabled.toSorted());
      });
    },
    TIMEOUT,
  );
});

describe('plugin enable / disable', () => {
  test(
    'round-trips through the persisted file, and enabling twice is not an error',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(runDx(['plugin', 'disable', MARKDOWN], { home }).status).toBe(0);
        expect(listPlugins(home).find((row) => row.id === MARKDOWN)?.enabled).toBe(false);

        const contents = fs.readFileSync(path.join(home, '.config', 'dx', 'plugins', 'default.yml'), 'utf8');
        expect(contents).not.toContain(MARKDOWN);
        // Core is host policy, not a user choice — persisting it would outlive a host that stops
        // pinning the plugin.
        for (const id of getCore()) {
          expect(contents).not.toContain(id);
        }

        expect(runDx(['plugin', 'enable', MARKDOWN], { home }).status).toBe(0);
        // `enable` states a desired end state, so a user scripting it should not have to branch on
        // whether they already ran it.
        expect(runDx(['plugin', 'enable', MARKDOWN], { home }).status).toBe(0);
        expect(listPlugins(home).find((row) => row.id === MARKDOWN)?.enabled).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    'an empty file means nothing optional is enabled, not "use the defaults"',
    ({ expect }) => {
      withIsolatedHome((home) => {
        fs.mkdirSync(path.dirname(path.join(home, '.config', 'dx', 'plugins', 'default.yml')), { recursive: true });
        fs.writeFileSync(path.join(home, '.config', 'dx', 'plugins', 'default.yml'), '[]\n');

        const enabled = listPlugins(home)
          .filter((row) => row.enabled)
          .map((row) => row.id);
        expect(enabled.toSorted()).toEqual(getCore().toSorted());
      });
    },
    TIMEOUT,
  );

  test(
    'refuses a core plugin and an unknown id, pointing at `dx plugin list`',
    ({ expect }) => {
      withIsolatedHome((home) => {
        // The CLI renders command failures on stdout rather than stderr; assert on both so these
        // stay true of the message, not of the stream it happens to land on.
        const core = runDx(['plugin', 'disable', CLIENT], { home });
        expect(core.status).toBe(1);
        expect(core.stdout + core.stderr).toContain('dx plugin list');

        const unknown = runDx(['plugin', 'enable', 'org.dxos.plugin.nope'], { home });
        expect(unknown.status).toBe(1);
        expect(unknown.stdout + unknown.stderr).toContain('dx plugin list');
      });
    },
    TIMEOUT,
  );
});

const listPlugins = (home: string, args: string[] = []): PluginRow[] => {
  const { stdout, stderr, status } = runDx(['--json', 'plugin', 'list', ...args], { home });
  if (status !== 0) {
    // eslint-disable-next-line no-console
    console.error('stdout:', stdout, '\nstderr:', stderr);
  }
  return JSON.parse(stdout);
};
