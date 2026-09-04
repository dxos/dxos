//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSettings from './AppSettings';

const DEVICE = 'device-a';
const OTHER = 'device-b';
const NS = 'org.dxos.plugin.markdown';

const draft = (init?: Partial<AppSettings.Draft>): AppSettings.Draft => ({
  shared: {},
  devices: {},
  ...init,
});

describe('resolve', () => {
  test('layers defaults, shared and device overrides', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: false, folding: true } },
      devices: { [DEVICE]: { overrides: { [NS]: { folding: false } }, unsynced: [] } },
    });

    expect(AppSettings.resolve(settings, DEVICE, NS, { toolbar: true, folding: true, debug: false })).toEqual({
      toolbar: false,
      folding: false,
      debug: false,
    });
  });

  test('another device is unaffected by an override', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: false } },
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: true } }, unsynced: [] } },
    });

    expect(AppSettings.resolve(settings, OTHER, NS)).toEqual({ toolbar: false });
  });

  test('an override matching the shared value survives a change made elsewhere', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: true } }, unsynced: [] } },
    });
    settings.shared[NS].toolbar = false;

    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: true });
    expect(AppSettings.resolve(settings, OTHER, NS)).toEqual({ toolbar: false });
  });
});

describe('setValue', () => {
  test('writes to the shared layer by default', () => {
    const settings = draft();
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', true);

    expect(settings.shared[NS]).toEqual({ toolbar: true });
    expect(settings.devices[DEVICE]).toBeUndefined();
  });

  test('writes to the device layer once the namespace is unsynced', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);

    expect(settings.shared[NS]).toEqual({ toolbar: true });
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({ toolbar: false });
  });
});

describe('setSynced', () => {
  test('turning sync off with a snapshot changes nothing here and nothing elsewhere', () => {
    const settings = draft({ shared: { [NS]: { toolbar: false } } });
    const defaults = { toolbar: true, folding: true };
    const before = AppSettings.resolve(settings, DEVICE, NS, defaults);

    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: before });

    expect(AppSettings.resolve(settings, DEVICE, NS, defaults)).toEqual(before);
    expect(AppSettings.resolve(settings, OTHER, NS, defaults)).toEqual(before);
  });

  test('once unsynced, a change made elsewhere no longer lands here', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: AppSettings.resolve(settings, DEVICE, NS) });

    AppSettings.setValue(settings, OTHER, NS, 'toolbar', false);

    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: true });
    expect(AppSettings.resolve(settings, OTHER, NS)).toEqual({ toolbar: false });
  });

  test('a key added to the account after unsyncing still arrives', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: AppSettings.resolve(settings, DEVICE, NS) });

    // A plugin update adds a field, set on the other device.
    AppSettings.setValue(settings, OTHER, NS, 'folding', true);

    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: true, folding: true });
  });

  test('turning sync back on keeps the account’s value where the two disagree', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: AppSettings.resolve(settings, DEVICE, NS) });
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);
    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: false });

    AppSettings.setSynced(settings, DEVICE, NS, true);

    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: true });
    expect(AppSettings.isSynced(settings, DEVICE, NS)).toBe(true);
    expect(settings.devices[DEVICE].overrides[NS]).toBeUndefined();
  });

  test('rejoining with adopt local publishes this device’s values to the account', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: AppSettings.resolve(settings, DEVICE, NS) });
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);

    AppSettings.setSynced(settings, DEVICE, NS, true, { adopt: 'local' });

    // Both devices now see this device's value, and the key it never disagreed on is untouched.
    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: false, folding: true });
    expect(AppSettings.resolve(settings, OTHER, NS)).toEqual({ toolbar: false, folding: true });
    expect(settings.devices[DEVICE].overrides[NS]).toBeUndefined();
  });

  test('adopt local leaves keys the account has but this device never overrode', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'folding', true);
    // Meanwhile the account changes a key this device is not holding an opinion on.
    AppSettings.setValue(settings, OTHER, NS, 'toolbar', false);

    AppSettings.setSynced(settings, DEVICE, NS, true, { adopt: 'local' });

    expect(settings.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('unsyncing one namespace leaves the others shared', () => {
    const other = 'org.dxos.plugin.chess';
    const settings = draft();
    AppSettings.setSynced(settings, DEVICE, NS, false);

    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', true);
    AppSettings.setValue(settings, DEVICE, other, 'hints', true);

    expect(settings.devices[DEVICE].overrides).toEqual({ [NS]: { toolbar: true } });
    expect(settings.shared).toEqual({ [other]: { hints: true } });
    expect(AppSettings.isSynced(settings, DEVICE, other)).toBe(true);
  });
});

describe('applyResolved', () => {
  test('routes changed keys to the layer the namespace writes to', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);

    AppSettings.applyResolved(
      settings,
      DEVICE,
      NS,
      { toolbar: true, folding: true },
      { toolbar: false, folding: true },
    );

    expect(settings.shared[NS]).toEqual({ toolbar: true, folding: true });
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({ toolbar: false });
  });

  test('a dropped key is cleared from both layers', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: false } }, unsynced: [] } },
    });

    AppSettings.applyResolved(settings, DEVICE, NS, { toolbar: false }, {});

    expect(settings.shared[NS]).toEqual({});
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({});
  });

  test('an unchanged value writes nothing', () => {
    const settings = draft({ shared: { [NS]: { snippets: ['a', 'b'] } } });
    AppSettings.applyResolved(settings, DEVICE, NS, { snippets: ['a', 'b'] }, { snippets: ['a', 'b'] });

    expect(settings.devices).toEqual({});
  });
});

/**
 * The plugin set is an ordinary namespace whose keys are plugin ids and whose values are booleans.
 * Unsyncing it is a SOFT fork — the switch changes where this device's decisions are written, and
 * plugins it never touched keep following the account.
 */
describe('plugins', () => {
  const PLUGINS = AppSettings.PLUGINS_NAMESPACE;
  const MARKDOWN = 'org.dxos.plugin.markdown';
  const CHESS = 'org.dxos.plugin.chess';
  const SKETCH = 'org.dxos.plugin.sketch';

  /** Record what a device currently has enabled, as the sync's plugin binding does. */
  const record = (
    settings: AppSettings.Draft,
    deviceKey: string,
    enabled: readonly string[],
    known: readonly string[],
  ) => {
    const before = AppSettings.resolve(settings, deviceKey, PLUGINS);
    const after = Object.fromEntries(known.map((id) => [id, enabled.includes(id)]));
    AppSettings.applyResolved(settings, deviceKey, PLUGINS, before, { ...before, ...after });
  };

  /** Resolve the enabled set for a device whose local state is `local`. */
  const enabledOn = (settings: AppSettings.Draft, deviceKey: string, local: readonly string[] = []) =>
    AppSettings.getEnabledPlugins(
      AppSettings.resolve(settings, deviceKey, PLUGINS, Object.fromEntries(local.map((id) => [id, true]))),
    ).sort();

  test('an id with no recorded decision follows the local set', () => {
    const settings = draft();

    expect(enabledOn(settings, DEVICE, [MARKDOWN])).toEqual([MARKDOWN]);
  });

  test('a shared decision adds and removes plugins on every device', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(settings, OTHER, [SKETCH])).toEqual([CHESS, MARKDOWN]);
  });

  test('a device using its own plugin set diverges only on what it changes', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);

    // Soft fork: no snapshot, so untouched plugins keep following the account.
    AppSettings.setSynced(settings, DEVICE, PLUGINS, false);
    record(settings, DEVICE, [MARKDOWN], [MARKDOWN, CHESS]);

    expect(enabledOn(settings, DEVICE)).toEqual([MARKDOWN]);
    expect(enabledOn(settings, OTHER)).toEqual([CHESS, MARKDOWN]);
    expect(settings.shared[PLUGINS]).toEqual({ [MARKDOWN]: true, [CHESS]: true });
    expect(settings.devices[DEVICE].overrides[PLUGINS]).toEqual({ [CHESS]: false });
  });

  test('a plugin enabled elsewhere still arrives on a device with its own plugin set', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(settings, DEVICE, PLUGINS, false);
    record(settings, DEVICE, [MARKDOWN], [MARKDOWN, CHESS]);

    record(settings, OTHER, [MARKDOWN, CHESS, SKETCH], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(settings, DEVICE)).toEqual([MARKDOWN, SKETCH]);
  });

  test('rejoining the account restores the shared plugin set', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(settings, DEVICE, PLUGINS, false);
    record(settings, DEVICE, [MARKDOWN], [MARKDOWN, CHESS]);

    AppSettings.setSynced(settings, DEVICE, PLUGINS, true);

    expect(enabledOn(settings, DEVICE)).toEqual([CHESS, MARKDOWN]);
  });

  test('installed remote plugins are shared entry-by-entry', () => {
    const installed = AppSettings.INSTALLED_NAMESPACE;
    const settings = draft();
    const entry: AppSettings.InstalledPlugin = {
      id: CHESS,
      url: 'https://example.com/chess/plugin.json',
      version: 'v1.0.0',
    };
    AppSettings.applyResolved(settings, DEVICE, installed, {}, { [CHESS]: entry });

    expect(AppSettings.resolve(settings, OTHER, installed)).toEqual({ [CHESS]: entry });

    AppSettings.applyResolved(settings, DEVICE, installed, { [CHESS]: entry }, {});
    expect(AppSettings.resolve(settings, OTHER, installed)).toEqual({});
  });
});

describe('conflictingKeys', () => {
  test('nothing to decide when the device overrides nothing', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);

    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual([]);
  });

  test('an override equal to the shared value is not a conflict', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false, { snapshot: AppSettings.resolve(settings, DEVICE, NS) });

    // Frozen on leaving, so the device holds the key — but it agrees, so nothing is lost either way.
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({ toolbar: true });
    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual([]);
  });

  test('a differing override conflicts', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);

    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual(['toolbar']);
  });

  test('a key only this device holds is not a conflict — rejoining adopts it', () => {
    const settings = draft();
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'folding', true);

    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual([]);

    AppSettings.setSynced(settings, DEVICE, NS, true);
    expect(settings.shared[NS]).toEqual({ folding: true });
  });

  test('a key only the account holds does not conflict', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'folding', true);
    AppSettings.setValue(settings, OTHER, NS, 'toolbar', false);

    // `toolbar` follows the account here already and `folding` is this device's alone, so neither
    // forces a choice.
    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual([]);
  });

  test('compares by value, so an equal object is not a conflict', () => {
    const settings = draft({ shared: { [NS]: { layout: { columns: 2 } } } });
    AppSettings.setSynced(settings, DEVICE, NS, false);
    AppSettings.setValue(settings, DEVICE, NS, 'layout', { columns: 2 });

    expect(AppSettings.conflictingKeys(settings, DEVICE, NS)).toEqual([]);
  });
});
