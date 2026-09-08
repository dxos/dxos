//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSettings from './AppSettings';

const NS = 'org.dxos.plugin.markdown';

/**
 * One device: its pins over the replicated layer, plus the namespace's own store — which is where
 * every value actually lives, pinned or not.
 */
type Device = {
  settings: AppSettings.Draft;
  local: AppSettings.Values;
};

const device = (init?: { shared?: AppSettings.Namespaces; local?: AppSettings.Values }): Device => ({
  settings: { shared: init?.shared ?? {}, local: AppSettings.makeDeviceSettings() },
  local: { ...init?.local },
});

/** Another of the user's devices: its own pins over the same replicated layer, shared by reference. */
const otherDevice = (from: Device, local: AppSettings.Values = {}): Device => ({
  settings: { shared: from.settings.shared, local: AppSettings.makeDeviceSettings() },
  local: { ...local },
});

const resolve = (target: Device, namespace = NS) => AppSettings.resolve(target.settings, namespace, target.local);

/** An edit made on a device: the value lands in its own store, and the pin decides who else sees it. */
const write = (target: Device, key: string, value: unknown, namespace = NS) => {
  target.local[key] = value;
  AppSettings.setValue(target.settings, namespace, key, value);
};

/** Put the resolved values into effect locally, as the reconciler does after any change. */
const settle = (target: Device, namespace = NS) => {
  target.local = resolve(target, namespace);
};

describe('resolve', () => {
  test('the account wins over the local store, except where this device pins a key', () => {
    const target = device({
      shared: { [NS]: { toolbar: false, folding: true } },
      local: { toolbar: true, folding: false, debug: false },
    });
    AppSettings.setKeySynced(target.settings, NS, 'folding', false);

    expect(resolve(target)).toEqual({ toolbar: false, folding: false, debug: false });
  });

  test('another device is unaffected by a pin', () => {
    const target = device({ shared: { [NS]: { toolbar: false } }, local: { toolbar: true } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    expect(resolve(otherDevice(target))).toEqual({ toolbar: false });
  });

  test('a pin whose value agrees survives a change made elsewhere', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    target.settings.shared[NS].toolbar = false;

    expect(resolve(target)).toEqual({ toolbar: true });
    expect(resolve(otherDevice(target))).toEqual({ toolbar: false });
  });
});

describe('setValue', () => {
  test('writes to the account by default', () => {
    const target = device();
    write(target, 'toolbar', true);

    expect(target.settings.shared[NS]).toEqual({ toolbar: true });
    expect(target.settings.local).toEqual({});
  });

  test('records a pin instead of writing, once the namespace is local', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local);

    write(target, 'toolbar', false);

    expect(target.settings.shared[NS]).toEqual({ toolbar: true });
    expect(target.settings.local[NS].keys).toEqual(['toolbar']);
  });
});

describe('setSynced', () => {
  test('leaving with a freeze changes nothing here and nothing elsewhere', () => {
    const target = device({ shared: { [NS]: { toolbar: false } }, local: { toolbar: true, folding: true } });
    settle(target);
    const before = resolve(target);

    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });

    expect(resolve(target)).toEqual(before);
    expect(resolve(otherDevice(target, before))).toEqual(before);
  });

  test('once frozen, a change made elsewhere no longer lands here', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });

    write(otherDevice(target), 'toolbar', false);

    expect(resolve(target)).toEqual({ toolbar: true });
  });

  test('a key the account gains after the freeze still arrives', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });

    // A plugin update adds a field, set on the other device. It did not exist to be frozen.
    write(otherDevice(target), 'folding', true);

    expect(resolve(target)).toEqual({ toolbar: true, folding: true });
  });

  test('rejoining keeps the account’s value where the two disagree', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });
    write(target, 'toolbar', false);
    expect(resolve(target)).toEqual({ toolbar: false });

    AppSettings.setSynced(target.settings, NS, true, target.local);

    expect(resolve(target)).toEqual({ toolbar: true });
    expect(AppSettings.isSynced(target.settings, NS)).toBe(true);
    expect(target.settings.local[NS]).toBeUndefined();
  });

  test('rejoining with adopt local publishes this device’s values to the account', () => {
    const target = device({
      shared: { [NS]: { toolbar: true, folding: true } },
      local: { toolbar: true, folding: true },
    });
    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });
    write(target, 'toolbar', false);

    AppSettings.setSynced(target.settings, NS, true, target.local, { adopt: 'local' });

    expect(resolve(target)).toEqual({ toolbar: false, folding: true });
    expect(resolve(otherDevice(target))).toEqual({ toolbar: false, folding: true });
    expect(target.settings.local[NS]).toBeUndefined();
  });

  test('adopt local leaves keys the account has but this device never pinned', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local);
    write(target, 'folding', true);
    // Meanwhile the account changes a key this device holds no opinion on.
    write(otherDevice(target), 'toolbar', false);

    AppSettings.setSynced(target.settings, NS, true, target.local, { adopt: 'local' });

    expect(target.settings.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('taking one namespace local leaves the others shared', () => {
    const other = 'org.dxos.plugin.chess';
    const target = device();
    AppSettings.setSynced(target.settings, NS, false, target.local);

    write(target, 'toolbar', true);
    write(target, 'hints', true, other);

    expect(target.settings.local[NS].keys).toEqual(['toolbar']);
    expect(target.settings.shared).toEqual({ [other]: { hints: true } });
    expect(AppSettings.isSynced(target.settings, other)).toBe(true);
  });
});

describe('applyResolved', () => {
  test('routes changed keys by whether the namespace still shares', () => {
    const target = device({
      shared: { [NS]: { toolbar: true, folding: true } },
      local: { toolbar: true, folding: true },
    });
    AppSettings.setSynced(target.settings, NS, false, target.local);

    AppSettings.applyResolved(target.settings, NS, { toolbar: true, folding: true }, { toolbar: false, folding: true });

    expect(target.settings.shared[NS]).toEqual({ toolbar: true, folding: true });
    expect(target.settings.local[NS].keys).toEqual(['toolbar']);
  });

  test('a dropped key is cleared from the account and unpinned', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: false } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    AppSettings.applyResolved(target.settings, NS, { toolbar: false }, {});

    expect(target.settings.shared[NS]).toEqual({});
    expect(target.settings.local[NS]).toBeUndefined();
  });

  test('an unchanged value writes nothing', () => {
    const target = device({ shared: { [NS]: { snippets: ['a', 'b'] } } });
    AppSettings.applyResolved(target.settings, NS, { snippets: ['a', 'b'] }, { snippets: ['a', 'b'] });

    expect(target.settings.local).toEqual({});
  });
});

/**
 * The plugin set is an ordinary namespace keyed by plugin id. Taking it local is a soft fork: plugins
 * this device never touched keep following the account.
 */
describe('plugins', () => {
  const PLUGINS = AppSettings.PLUGINS_NAMESPACE;
  const MARKDOWN = 'org.dxos.plugin.markdown';
  const CHESS = 'org.dxos.plugin.chess';
  const SKETCH = 'org.dxos.plugin.sketch';

  /** A device whose own plugin set is `installed`, all enabled, as the manager would report it. */
  const pluginDevice = (installed: readonly string[] = []) =>
    device({ local: Object.fromEntries(installed.map((id) => [id, true])) });

  /** Record what a device currently has enabled, as the sync's plugin binding does. */
  const record = (target: Device, enabled: readonly string[], known: readonly string[]) => {
    const before = resolve(target, PLUGINS);
    const after = { ...before, ...Object.fromEntries(known.map((id) => [id, enabled.includes(id)])) };
    AppSettings.applyResolved(target.settings, PLUGINS, before, after);
    target.local = after;
  };

  const enabledOn = (target: Device) => AppSettings.getEnabledPlugins(resolve(target, PLUGINS)).sort();

  test('an id with no recorded decision follows the local set', () => {
    expect(enabledOn(pluginDevice([MARKDOWN]))).toEqual([MARKDOWN]);
  });

  test('a shared decision adds and removes plugins on every device', () => {
    const target = pluginDevice();
    record(target, [MARKDOWN, CHESS], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(otherDevice(target, { [SKETCH]: true }))).toEqual([CHESS, MARKDOWN]);
  });

  test('a device using its own plugin set diverges only on what it changes', () => {
    const target = pluginDevice();
    record(target, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);

    // Soft fork: no freeze, so untouched plugins keep following the account.
    AppSettings.setSynced(target.settings, PLUGINS, false, target.local);
    record(target, [MARKDOWN], [MARKDOWN, CHESS]);

    expect(enabledOn(target)).toEqual([MARKDOWN]);
    expect(enabledOn(otherDevice(target))).toEqual([CHESS, MARKDOWN]);
    expect(target.settings.shared[PLUGINS]).toEqual({ [MARKDOWN]: true, [CHESS]: true });
    expect(target.settings.local[PLUGINS].keys).toEqual([CHESS]);
  });

  test('a plugin enabled elsewhere still arrives on a device with its own plugin set', () => {
    const target = pluginDevice();
    record(target, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(target.settings, PLUGINS, false, target.local);
    record(target, [MARKDOWN], [MARKDOWN, CHESS]);

    record(otherDevice(target), [MARKDOWN, CHESS, SKETCH], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(target)).toEqual([MARKDOWN, SKETCH]);
  });

  test('rejoining the account restores the shared plugin set', () => {
    const target = pluginDevice();
    record(target, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.setSynced(target.settings, PLUGINS, false, target.local);
    record(target, [MARKDOWN], [MARKDOWN, CHESS]);

    AppSettings.setSynced(target.settings, PLUGINS, true, target.local);

    expect(enabledOn(target)).toEqual([CHESS, MARKDOWN]);
  });

  test('installed remote plugins are shared entry-by-entry', () => {
    const installed = AppSettings.INSTALLED_NAMESPACE;
    const target = device();
    const entry: AppSettings.InstalledPlugin = {
      id: CHESS,
      url: 'https://example.com/chess/plugin.json',
      version: 'v1.0.0',
    };
    AppSettings.applyResolved(target.settings, installed, {}, { [CHESS]: entry });

    expect(resolve(otherDevice(target), installed)).toEqual({ [CHESS]: entry });

    AppSettings.applyResolved(target.settings, installed, { [CHESS]: entry }, {});
    expect(resolve(otherDevice(target), installed)).toEqual({});
  });
});

describe('conflictingKeys', () => {
  const conflicts = (target: Device, namespace = NS) =>
    AppSettings.conflictingKeys(target.settings, namespace, target.local);

  test('nothing to decide when the device has pinned nothing', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local);

    expect(conflicts(target)).toEqual([]);
  });

  test('a pin whose value agrees is not a conflict', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local, { freeze: true });

    expect(target.settings.local[NS].keys).toEqual(['toolbar']);
    expect(conflicts(target)).toEqual([]);
  });

  test('a differing pin conflicts', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local);
    write(target, 'toolbar', false);

    expect(conflicts(target)).toEqual(['toolbar']);
  });

  test('a key only this device holds is not a conflict — rejoining adopts it', () => {
    const target = device();
    AppSettings.setSynced(target.settings, NS, false, target.local);
    write(target, 'folding', true);

    expect(conflicts(target)).toEqual([]);

    AppSettings.setSynced(target.settings, NS, true, target.local);
    expect(target.settings.shared[NS]).toEqual({ folding: true });
  });

  test('a key only the account holds does not conflict', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setSynced(target.settings, NS, false, target.local);
    write(target, 'folding', true);
    write(otherDevice(target), 'toolbar', false);

    expect(conflicts(target)).toEqual([]);
  });

  test('compares by value, so an equal object is not a conflict', () => {
    const target = device({ shared: { [NS]: { layout: { columns: 2 } } } });
    AppSettings.setSynced(target.settings, NS, false, target.local);
    write(target, 'layout', { columns: 2 });

    expect(conflicts(target)).toEqual([]);
  });
});

describe('per-key pins', () => {
  test('pinning changes nothing visible, here or elsewhere', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    const before = resolve(target);

    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    expect(resolve(target)).toEqual(before);
    expect(resolve(otherDevice(target))).toEqual(before);
    expect(AppSettings.isKeySynced(target.settings, NS, 'toolbar')).toBe(false);
  });

  test('a pinned key takes writes here while the rest of the namespace still shares', () => {
    const target = device({
      shared: { [NS]: { toolbar: true, folding: true } },
      local: { toolbar: true, folding: true },
    });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    write(target, 'toolbar', false);
    write(target, 'folding', false);

    expect(target.settings.local[NS].keys).toEqual(['toolbar']);
    expect(target.settings.shared[NS]).toEqual({ toolbar: true, folding: false });
    expect(resolve(otherDevice(target))).toEqual({ toolbar: true, folding: false });
  });

  test('a pinned key ignores the account changing it', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    write(otherDevice(target), 'toolbar', false);

    expect(resolve(target)).toEqual({ toolbar: true });
  });

  test('unpinning hands the key back to the account', () => {
    const target = device({ shared: { [NS]: { toolbar: true } }, local: { toolbar: true } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);
    write(target, 'toolbar', false);

    AppSettings.setKeySynced(target.settings, NS, 'toolbar', true);

    expect(resolve(target)).toEqual({ toolbar: true });
    expect(AppSettings.isKeySynced(target.settings, NS, 'toolbar')).toBe(true);
    expect(target.settings.local[NS]).toBeUndefined();
  });

  test('pinning a key still on its schema default holds the default', () => {
    // Nobody has written `toolbar`, so the account has no entry for it.
    const target = device({ local: { toolbar: true } });
    AppSettings.setKeySynced(target.settings, NS, 'toolbar', false);

    write(otherDevice(target), 'toolbar', false);

    expect(resolve(target)).toEqual({ toolbar: true });
  });

  test('a plugin pinned off stays off while the rest of the set follows the account', () => {
    const PLUGINS = AppSettings.PLUGINS_NAMESPACE;
    const chess = 'org.dxos.plugin.chess';
    const stack = 'org.dxos.plugin.stack';
    const target = device({
      shared: { [PLUGINS]: { [chess]: true, [stack]: true } },
      local: { [chess]: true, [stack]: true },
    });

    AppSettings.setKeySynced(target.settings, PLUGINS, chess, false);
    write(target, chess, false, PLUGINS);

    expect(AppSettings.getEnabledPlugins(resolve(target, PLUGINS)).sort()).toEqual([stack]);
    expect(AppSettings.getEnabledPlugins(resolve(otherDevice(target), PLUGINS)).sort()).toEqual([chess, stack].sort());
  });
});
