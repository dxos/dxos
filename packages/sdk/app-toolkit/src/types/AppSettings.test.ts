//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSettings from './AppSettings';

const NS = 'org.dxos.plugin.markdown';

const draft = (init?: Partial<AppSettings.Draft>): AppSettings.Draft => ({
  shared: {},
  local: AppSettings.makeDeviceSettings(),
  ...init,
});

/**
 * Another of the user's devices: its own local layer over the same replicated one. Sharing the
 * `shared` reference is what replication does, so a write through this view is what the account
 * sees change.
 */
const otherDevice = (settings: AppSettings.Draft): AppSettings.Draft => ({
  shared: settings.shared,
  local: AppSettings.makeDeviceSettings(),
});

describe('resolve', () => {
  test('layers defaults, shared and device overrides', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: false, folding: true } },
      local: { overrides: { [NS]: { folding: false } }, unsynced: [] },
    });

    expect(AppSettings.resolve(settings, NS, { toolbar: true, folding: true, debug: false })).toEqual({
      toolbar: false,
      folding: false,
      debug: false,
    });
  });

  test('another device is unaffected by an override', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: false } },
      local: { overrides: { [NS]: { toolbar: true } }, unsynced: [] },
    });

    expect(AppSettings.resolve(otherDevice(settings), NS)).toEqual({ toolbar: false });
  });

  test('an override matching the shared value survives a change made elsewhere', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      local: { overrides: { [NS]: { toolbar: true } }, unsynced: [] },
    });
    settings.shared[NS].toolbar = false;

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
    expect(AppSettings.resolve(otherDevice(settings), NS)).toEqual({ toolbar: false });
  });
});

describe('setValue', () => {
  test('writes to the shared layer by default', () => {
    const settings = draft();
    AppSettings.setValue(settings, NS, 'toolbar', true);

    expect(settings.shared[NS]).toEqual({ toolbar: true });
    expect(settings.local.overrides).toEqual({});
  });

  test('writes to the device layer once the namespace is unsynced', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'toolbar', false);

    expect(settings.shared[NS]).toEqual({ toolbar: true });
    expect(settings.local.overrides[NS]).toEqual({ toolbar: false });
  });
});

describe('setSynced', () => {
  test('turning sync off with a snapshot changes nothing here and nothing elsewhere', () => {
    const settings = draft({ shared: { [NS]: { toolbar: false } } });
    const defaults = { toolbar: true, folding: true };
    const before = AppSettings.resolve(settings, NS, defaults);

    AppSettings.setSynced(settings, NS, false, { snapshot: before });

    expect(AppSettings.resolve(settings, NS, defaults)).toEqual(before);
    expect(AppSettings.resolve(otherDevice(settings), NS, defaults)).toEqual(before);
  });

  test('once unsynced, a change made elsewhere no longer lands here', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false, { snapshot: AppSettings.resolve(settings, NS) });

    AppSettings.setValue(otherDevice(settings), NS, 'toolbar', false);

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
    expect(AppSettings.resolve(otherDevice(settings), NS)).toEqual({ toolbar: false });
  });

  test('a key added to the account after unsyncing still arrives', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false, { snapshot: AppSettings.resolve(settings, NS) });

    // A plugin update adds a field, set on the other device.
    AppSettings.setValue(otherDevice(settings), NS, 'folding', true);

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true, folding: true });
  });

  test('turning sync back on keeps the account’s value where the two disagree', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false, { snapshot: AppSettings.resolve(settings, NS) });
    AppSettings.setValue(settings, NS, 'toolbar', false);
    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: false });

    AppSettings.setSynced(settings, NS, true);

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
    expect(AppSettings.isSynced(settings, NS)).toBe(true);
    expect(settings.local.overrides[NS]).toBeUndefined();
  });

  test('rejoining with adopt local publishes this device’s values to the account', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.setSynced(settings, NS, false, { snapshot: AppSettings.resolve(settings, NS) });
    AppSettings.setValue(settings, NS, 'toolbar', false);

    AppSettings.setSynced(settings, NS, true, { adopt: 'local' });

    // Both devices now see this device's value, and the key it never disagreed on is untouched.
    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: false, folding: true });
    expect(AppSettings.resolve(otherDevice(settings), NS)).toEqual({ toolbar: false, folding: true });
    expect(settings.local.overrides[NS]).toBeUndefined();
  });

  test('adopt local leaves keys the account has but this device never overrode', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'folding', true);
    // Meanwhile the account changes a key this device is not holding an opinion on.
    AppSettings.setValue(otherDevice(settings), NS, 'toolbar', false);

    AppSettings.setSynced(settings, NS, true, { adopt: 'local' });

    expect(settings.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('unsyncing one namespace leaves the others shared', () => {
    const other = 'org.dxos.plugin.chess';
    const settings = draft();
    AppSettings.setSynced(settings, NS, false);

    AppSettings.setValue(settings, NS, 'toolbar', true);
    AppSettings.setValue(settings, other, 'hints', true);

    expect(settings.local.overrides).toEqual({ [NS]: { toolbar: true } });
    expect(settings.shared).toEqual({ [other]: { hints: true } });
    expect(AppSettings.isSynced(settings, other)).toBe(true);
  });
});

describe('applyResolved', () => {
  test('routes changed keys to the layer the namespace writes to', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.setSynced(settings, NS, false);

    AppSettings.applyResolved(settings, NS, { toolbar: true, folding: true }, { toolbar: false, folding: true });

    expect(settings.shared[NS]).toEqual({ toolbar: true, folding: true });
    expect(settings.local.overrides[NS]).toEqual({ toolbar: false });
  });

  test('a dropped key is cleared from both layers', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      local: { overrides: { [NS]: { toolbar: false } }, unsynced: [] },
    });

    AppSettings.applyResolved(settings, NS, { toolbar: false }, {});

    expect(settings.shared[NS]).toEqual({});
    expect(settings.local.overrides[NS]).toEqual({});
  });

  test('an unchanged value writes nothing', () => {
    const settings = draft({ shared: { [NS]: { snippets: ['a', 'b'] } } });
    AppSettings.applyResolved(settings, NS, { snippets: ['a', 'b'] }, { snippets: ['a', 'b'] });

    expect(settings.local.overrides).toEqual({});
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
  const record = (view: AppSettings.Draft, enabled: readonly string[], known: readonly string[]) => {
    const before = AppSettings.resolve(view, PLUGINS);
    const after = Object.fromEntries(known.map((id) => [id, enabled.includes(id)]));
    AppSettings.applyResolved(view, PLUGINS, before, { ...before, ...after });
  };

  /** Resolve the enabled set for a device whose own plugin set is `installed`. */
  const enabledOn = (view: AppSettings.Draft, installed: readonly string[] = []) =>
    AppSettings.getEnabledPlugins(
      AppSettings.resolve(view, PLUGINS, Object.fromEntries(installed.map((id) => [id, true]))),
    ).sort();

  test('an id with no recorded decision follows the local set', () => {
    const settings = draft();

    expect(enabledOn(settings, [MARKDOWN])).toEqual([MARKDOWN]);
  });

  test('a shared decision adds and removes plugins on every device', () => {
    const settings = draft();
    record(settings, [MARKDOWN, CHESS], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(otherDevice(settings), [SKETCH])).toEqual([CHESS, MARKDOWN]);
  });

  test('a device using its own plugin set diverges only on what it changes', () => {
    const settings = draft();
    record(settings, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);

    // Soft fork: no snapshot, so untouched plugins keep following the account.
    AppSettings.setSynced(settings, PLUGINS, false);
    record(settings, [MARKDOWN], [MARKDOWN, CHESS]);

    expect(enabledOn(settings)).toEqual([MARKDOWN]);
    expect(enabledOn(otherDevice(settings))).toEqual([CHESS, MARKDOWN]);
    expect(settings.shared[PLUGINS]).toEqual({ [MARKDOWN]: true, [CHESS]: true });
    expect(settings.local.overrides[PLUGINS]).toEqual({ [CHESS]: false });
  });

  test('a plugin enabled elsewhere still arrives on a device with its own plugin set', () => {
    const settings = draft();
    record(settings, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(settings, PLUGINS, false);
    record(settings, [MARKDOWN], [MARKDOWN, CHESS]);

    record(otherDevice(settings), [MARKDOWN, CHESS, SKETCH], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(settings)).toEqual([MARKDOWN, SKETCH]);
  });

  test('rejoining the account restores the shared plugin set', () => {
    const settings = draft();
    record(settings, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(settings, PLUGINS, false);
    record(settings, [MARKDOWN], [MARKDOWN, CHESS]);

    AppSettings.setSynced(settings, PLUGINS, true);

    expect(enabledOn(settings)).toEqual([CHESS, MARKDOWN]);
  });

  test('installed remote plugins are shared entry-by-entry', () => {
    const installed = AppSettings.INSTALLED_NAMESPACE;
    const settings = draft();
    const entry: AppSettings.InstalledPlugin = {
      id: CHESS,
      url: 'https://example.com/chess/plugin.json',
      version: 'v1.0.0',
    };
    AppSettings.applyResolved(settings, installed, {}, { [CHESS]: entry });

    expect(AppSettings.resolve(otherDevice(settings), installed)).toEqual({ [CHESS]: entry });

    AppSettings.applyResolved(settings, installed, { [CHESS]: entry }, {});
    expect(AppSettings.resolve(otherDevice(settings), installed)).toEqual({});
  });
});

describe('conflictingKeys', () => {
  test('nothing to decide when the device overrides nothing', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false);

    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);
  });

  test('an override equal to the shared value is not a conflict', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false, { snapshot: AppSettings.resolve(settings, NS) });

    // Frozen on leaving, so the device holds the key — but it agrees, so nothing is lost either way.
    expect(settings.local.overrides[NS]).toEqual({ toolbar: true });
    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);
  });

  test('a differing override conflicts', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'toolbar', false);

    expect(AppSettings.conflictingKeys(settings, NS)).toEqual(['toolbar']);
  });

  test('a key only this device holds is not a conflict — rejoining adopts it', () => {
    const settings = draft();
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'folding', true);

    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);

    AppSettings.setSynced(settings, NS, true);
    expect(settings.shared[NS]).toEqual({ folding: true });
  });

  test('a key only the account holds does not conflict', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'folding', true);
    AppSettings.setValue(otherDevice(settings), NS, 'toolbar', false);

    // `toolbar` follows the account here already and `folding` is this device's alone, so neither
    // forces a choice.
    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);
  });

  test('compares by value, so an equal object is not a conflict', () => {
    const settings = draft({ shared: { [NS]: { layout: { columns: 2 } } } });
    AppSettings.setSynced(settings, NS, false);
    AppSettings.setValue(settings, NS, 'layout', { columns: 2 });

    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);
  });
});

describe('per-key overrides', () => {
  test('pinning a key freezes what is in effect and changes nothing visible', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    const before = AppSettings.resolve(settings, NS);

    AppSettings.setKeySynced(settings, NS, 'toolbar', false, before.toolbar);

    expect(AppSettings.resolve(settings, NS)).toEqual(before);
    expect(AppSettings.isKeySynced(settings, NS, 'toolbar')).toBe(false);
  });

  test('a pinned key takes writes here while the rest of the namespace still shares', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.setKeySynced(settings, NS, 'toolbar', false, true);

    AppSettings.setValue(settings, NS, 'toolbar', false);
    AppSettings.setValue(settings, NS, 'folding', false);

    // The pinned key diverged; its neighbour reached the account.
    expect(settings.local.overrides[NS]).toEqual({ toolbar: false });
    expect(settings.shared[NS]).toEqual({ toolbar: true, folding: false });
    expect(AppSettings.resolve(otherDevice(settings), NS)).toEqual({ toolbar: true, folding: false });
  });

  test('a pinned key ignores the account changing it', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setKeySynced(settings, NS, 'toolbar', false, true);

    AppSettings.setValue(otherDevice(settings), NS, 'toolbar', false);

    // Pinned on its value, not by it: the pin holds even though the two agreed when it was made.
    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
  });

  test('unpinning hands the key back to the account', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setKeySynced(settings, NS, 'toolbar', false, true);
    AppSettings.setValue(settings, NS, 'toolbar', false);

    AppSettings.setKeySynced(settings, NS, 'toolbar', true);

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
    expect(AppSettings.isKeySynced(settings, NS, 'toolbar')).toBe(true);
  });

  test('a pinned key whose value matches is not a conflict, so unpinning need not ask', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.setKeySynced(settings, NS, 'toolbar', false, true);

    expect(AppSettings.conflictingKeys(settings, NS)).toEqual([]);
  });

  test('pinning a key still on its schema default captures the default', () => {
    const settings = draft();
    // Nobody has written `toolbar`, so it lives in neither layer.
    AppSettings.setKeySynced(settings, NS, 'toolbar', false, true);

    AppSettings.setValue(otherDevice(settings), NS, 'toolbar', false);

    expect(AppSettings.resolve(settings, NS)).toEqual({ toolbar: true });
  });

  test('a plugin pinned off stays off while the rest of the set follows the account', () => {
    const PLUGINS = AppSettings.PLUGINS_NAMESPACE;
    const chess = 'org.dxos.plugin.chess';
    const stack = 'org.dxos.plugin.stack';
    const settings = draft({ shared: { [PLUGINS]: { [chess]: true, [stack]: true } } });

    AppSettings.setKeySynced(settings, PLUGINS, chess, false, true);
    AppSettings.setValue(settings, PLUGINS, chess, false);

    expect(AppSettings.getEnabledPlugins(AppSettings.resolve(settings, PLUGINS)).sort()).toEqual([stack]);
    expect(AppSettings.getEnabledPlugins(AppSettings.resolve(otherDevice(settings), PLUGINS)).sort()).toEqual(
      [chess, stack].sort(),
    );
  });
});
