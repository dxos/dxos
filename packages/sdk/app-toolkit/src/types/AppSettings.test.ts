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
      devices: { [DEVICE]: { overrides: { [NS]: { folding: false } } } },
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
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: true } } } },
    });

    expect(AppSettings.resolve(settings, OTHER, NS)).toEqual({ toolbar: false });
  });

  test('an override pinned to the shared value stays pinned when the shared value changes', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: true } } } },
    });
    settings.shared[NS].toolbar = false;

    expect(AppSettings.isPinned(settings, DEVICE, NS, 'toolbar')).toBe(true);
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

  test('writes to the device layer once pinned', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.pin(settings, DEVICE, NS, 'toolbar', true);
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);

    expect(settings.shared[NS]).toEqual({ toolbar: true });
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({ toolbar: false });
  });

  test('unpinning restores the shared value', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true } } });
    AppSettings.pin(settings, DEVICE, NS, 'toolbar', true);
    AppSettings.setValue(settings, DEVICE, NS, 'toolbar', false);
    AppSettings.unpin(settings, DEVICE, NS, 'toolbar');

    expect(AppSettings.resolve(settings, DEVICE, NS)).toEqual({ toolbar: true });
    expect(AppSettings.getPinnedKeys(settings, DEVICE, NS)).toEqual([]);
  });

  test('pinning seeds the value in effect so nothing visibly changes', () => {
    const settings = draft({ shared: { [NS]: { toolbar: false } } });
    const before = AppSettings.resolve(settings, DEVICE, NS, { toolbar: true, folding: true });
    AppSettings.pin(settings, DEVICE, NS, 'folding', before.folding);

    expect(AppSettings.resolve(settings, DEVICE, NS, { toolbar: true, folding: true })).toEqual(before);
  });
});

describe('applyResolved', () => {
  test('routes each changed key to its owning layer', () => {
    const settings = draft({ shared: { [NS]: { toolbar: true, folding: true } } });
    AppSettings.pin(settings, DEVICE, NS, 'folding', true);

    const before = AppSettings.resolve(settings, DEVICE, NS);
    AppSettings.applyResolved(settings, DEVICE, NS, before, { toolbar: false, folding: false });

    expect(settings.shared[NS]).toEqual({ toolbar: false, folding: true });
    expect(settings.devices[DEVICE].overrides[NS]).toEqual({ folding: false });
  });

  test('a dropped key is cleared from both layers', () => {
    const settings = draft({
      shared: { [NS]: { toolbar: true } },
      devices: { [DEVICE]: { overrides: { [NS]: { toolbar: false } } } },
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
 * The plugin set is an ordinary namespace whose keys are plugin ids and whose values are booleans,
 * so it needs no bespoke merge — these cover the behaviour that choice buys.
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

  test('a device override disables one plugin locally without affecting others', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.pin(settings, DEVICE, PLUGINS, CHESS, false);

    expect(enabledOn(settings, DEVICE)).toEqual([MARKDOWN]);
    expect(enabledOn(settings, OTHER)).toEqual([CHESS, MARKDOWN]);
  });

  test('a plugin enabled elsewhere after a device pinned another one still arrives', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN], [MARKDOWN, CHESS]);
    AppSettings.pin(settings, DEVICE, PLUGINS, CHESS, false);
    record(settings, OTHER, [MARKDOWN, SKETCH], [MARKDOWN, CHESS, SKETCH]);

    expect(enabledOn(settings, DEVICE)).toEqual([MARKDOWN, SKETCH]);
  });

  test('toggling a pinned plugin writes only to the device layer', () => {
    const settings = draft();
    record(settings, DEVICE, [MARKDOWN, CHESS], [MARKDOWN, CHESS]);
    AppSettings.pin(settings, DEVICE, PLUGINS, CHESS, true);
    record(settings, DEVICE, [MARKDOWN], [MARKDOWN, CHESS]);

    expect(settings.shared[PLUGINS]).toEqual({ [MARKDOWN]: true, [CHESS]: true });
    expect(settings.devices[DEVICE].overrides[PLUGINS]).toEqual({ [CHESS]: false });
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
