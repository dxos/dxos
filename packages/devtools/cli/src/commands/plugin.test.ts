//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runDx, withIsolatedHome } from '../testing';
import { getCore, getDefaults } from './plugin-defs';

/**
 * End-to-end subprocess tests for `dx plugin`. Each runs against a throwaway HOME so the
 * profile starts unconfigured, which is the state the default set is for.
 *
 * These are the contract the plugin-management surface has to hold: `installed` and `enabled`
 * are separate, the CLI decides its own core set rather than inheriting each plugin's `system`
 * tag, and the persisted file records the user's choices about optional plugins only.
 */

const CLIENT = 'org.dxos.plugin.client';
const MARKDOWN = 'org.dxos.plugin.markdown';
const SAMPLE = 'org.dxos.plugin.sample';

type PluginRow = {
  id: string;
  name: string;
  installed: boolean;
  enabled: boolean;
  core: boolean;
  status: string;
  failure?: string;
};

const listPlugins = (home: string, env?: Record<string, string>): PluginRow[] => {
  const { stdout, stderr, status } = runDx(['--json', 'plugin', 'list'], { home, env });
  if (status !== 0) {
    // eslint-disable-next-line no-console
    console.error('stdout:', stdout, '\nstderr:', stderr);
  }
  return JSON.parse(stdout);
};

/** Each `dx` spawn costs several seconds from source; vitest's 15s default is below the
 * cost of the multi-spawn cases. */
const TIMEOUT = 180_000;

const pluginsFile = (home: string) => path.join(home, '.config', 'dx', 'plugins', 'default.yml');

describe('plugin list', () => {
  test(
    'reports installed and enabled as separate fields',
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

        // The axes are genuinely independent: something is installed but not enabled. Without this
        // the collapsed single-status output would be indistinguishable.
        expect(rows.some((row) => row.installed && !row.enabled)).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    'core is the set the CLI supplies, not every `system`-tagged plugin',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const core = listPlugins(home)
          .filter((row) => row.core)
          .map((row) => row.id);
        expect(core.toSorted()).toEqual(getCore().toSorted());

        // Regression guard for the inherited-tagging defect: these three declare `system` in their
        // own `dx.config.ts` for Composer's benefit, and must stay disableable in the CLI.
        for (const id of ['org.dxos.plugin.observability', 'org.dxos.plugin.connector', 'org.dxos.plugin.routine']) {
          expect(core).not.toContain(id);
        }
      });
    },
    TIMEOUT,
  );

  test(
    'an unconfigured profile enables exactly the defaults, plus core',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const enabled = listPlugins(home)
          .filter((row) => row.enabled)
          .map((row) => row.id);
        expect(enabled.toSorted()).toEqual([...getDefaults(), ...getCore()].toSorted());
      });
    },
    TIMEOUT,
  );

  test(
    'DX_LABS enables the demo plugins',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(listPlugins(home).find((row) => row.id === SAMPLE)?.enabled).toBe(false);
        expect(listPlugins(home, { DX_LABS: 'true' }).find((row) => row.id === SAMPLE)?.enabled).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    '--enabled filters to the enabled set',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, status } = runDx(['--json', 'plugin', 'list', '--enabled'], { home });
        expect(status).toBe(0);
        const rows: PluginRow[] = JSON.parse(stdout);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.enabled)).toBe(true);
      });
    },
    TIMEOUT,
  );
});

describe('plugin enable / disable', () => {
  test(
    'disable persists and survives into the next invocation',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(runDx(['plugin', 'disable', MARKDOWN], { home }).status).toBe(0);
        expect(listPlugins(home).find((row) => row.id === MARKDOWN)?.enabled).toBe(false);

        expect(runDx(['plugin', 'enable', MARKDOWN], { home }).status).toBe(0);
        expect(listPlugins(home).find((row) => row.id === MARKDOWN)?.enabled).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    'the persisted file records optional plugins only',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(runDx(['plugin', 'disable', MARKDOWN], { home }).status).toBe(0);
        const contents = fs.readFileSync(pluginsFile(home), 'utf8');
        expect(contents).not.toContain(MARKDOWN);
        // Core is host policy, not a user choice — persisting it would outlive a host that stops
        // pinning the plugin.
        for (const id of getCore()) {
          expect(contents).not.toContain(id);
        }
      });
    },
    TIMEOUT,
  );

  test(
    'an empty file means nothing optional is enabled, not "use the defaults"',
    ({ expect }) => {
      withIsolatedHome((home) => {
        fs.mkdirSync(path.dirname(pluginsFile(home)), { recursive: true });
        fs.writeFileSync(pluginsFile(home), '[]\n');

        const enabled = listPlugins(home)
          .filter((row) => row.enabled)
          .map((row) => row.id);
        expect(enabled.toSorted()).toEqual(getCore().toSorted());
      });
    },
    TIMEOUT,
  );

  test(
    'enable is idempotent',
    ({ expect }) => {
      withIsolatedHome((home) => {
        expect(runDx(['plugin', 'enable', SAMPLE], { home }).status).toBe(0);
        expect(runDx(['plugin', 'enable', SAMPLE], { home }).status).toBe(0);
        expect(listPlugins(home).find((row) => row.id === SAMPLE)?.enabled).toBe(true);
      });
    },
    TIMEOUT,
  );

  test(
    'disabling a core plugin fails and says why',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'disable', CLIENT], { home });
        expect(status).toBe(1);
        // The CLI renders command failures on stdout rather than stderr; assert on both so this
        // stays true of the message, not of the stream it happens to land on.
        expect(stdout + stderr).toContain('dx plugin list');
      });
    },
    TIMEOUT,
  );

  test(
    'naming an unknown plugin fails and points at `dx plugin list`',
    ({ expect }) => {
      withIsolatedHome((home) => {
        const { stdout, stderr, status } = runDx(['plugin', 'enable', 'org.dxos.plugin.nope'], { home });
        expect(status).toBe(1);
        expect(stdout + stderr).toContain('dx plugin list');
      });
    },
    TIMEOUT,
  );
});
