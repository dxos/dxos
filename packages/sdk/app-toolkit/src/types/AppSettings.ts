//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/** Values for a single settings namespace, keyed by field name. */
export const Values = Schema.Record(Schema.String, Schema.Any);

/** Values for every namespace, keyed by namespace id. */
export const Namespaces = Schema.Record(Schema.String, Values);

/** This device's own settings layer, persisted locally and never replicated. */
export const DeviceSettings = Schema.Struct({
  /** Values this device overrides. A key's presence is the override, not its value. */
  overrides: Schema.mutableKey(Schema.Record(Schema.String, Schema.mutableKey(Values))),
  /** Namespaces whose writes go to this device's overrides instead of the shared layer. */
  unsynced: Schema.mutable(Schema.Array(Schema.String)),
});

/**
 * App configuration that replicates across a user's devices.
 *
 * A singleton in the settings space (`AppSpace.SETTINGS_SPACE_TAG`), which is hidden and
 * membership-locked; see {@link DeviceSettings} for the half that stays on the device.
 */
export class AppSettings extends Type.makeObject<AppSettings>(DXN.make('org.dxos.app.type.settings', '0.1.0'))(
  Schema.Struct({
    /** Values in effect on every device unless a device overrides them. */
    shared: Namespaces,
  }),
) {}

/** Create an empty settings object. */
export const make = (): AppSettings => Obj.make(AppSettings, { shared: {} });

/** Create an empty device layer, for the local store's initial value. */
export const makeDeviceSettings = (): DeviceSettings => ({ overrides: {}, unsynced: [] });

/** Mutable field values for one namespace. */
export type Values = Record<string, any>;

/** Values for every namespace, keyed by namespace id. Mutable counterpart of {@link Namespaces}. */
export type Namespaces = Record<string, Values>;

/** Mutable counterpart of {@link DeviceSettings}. */
export type DeviceSettings = { overrides: Namespaces; unsynced: string[] };

/** The plugin set, keyed by plugin id: present means decided, `true` means enabled. */
export const PLUGINS_NAMESPACE = 'org.dxos.app-framework.plugins';

/** Plugins installed from a URL, keyed by plugin id with an {@link InstalledPlugin} value. */
export const INSTALLED_NAMESPACE = 'org.dxos.app-framework.plugins.installed';

/** Value shape stored under {@link INSTALLED_NAMESPACE}. */
export type InstalledPlugin = { id: string; url: string; version?: string };

/** Shape the resolution helpers read: the replicated layer paired with this device's own. */
export type Snapshot = {
  readonly shared: Namespaces;
  readonly local: { readonly overrides: Namespaces; readonly unsynced?: readonly string[] };
};

/** Values this device overrides in a namespace. Empty when the device overrides nothing. */
export const getOverrides = (settings: Snapshot, namespace: string): Values =>
  settings.local.overrides[namespace] ?? {};

/** Namespaces this device writes locally rather than sharing. */
export const getUnsynced = (settings: Snapshot): readonly string[] => settings.local.unsynced ?? [];

/** Whether edits to `namespace` on this device are shared with the user's other devices. */
export const isSynced = (settings: Snapshot, namespace: string): boolean => !getUnsynced(settings).includes(namespace);

/** Whether this device holds its own value for one key. */
export const isOverridden = (settings: Snapshot, namespace: string, key: string): boolean =>
  key in getOverrides(settings, namespace);

/** Whether one key's edits reach the user's other devices — the per-key counterpart of {@link isSynced}. */
export const isKeySynced = (settings: Snapshot, namespace: string, key: string): boolean =>
  isSynced(settings, namespace) && !isOverridden(settings, namespace, key);

/**
 * The values in effect on this device: `defaults`, overlaid with the shared values, overlaid with
 * this device's overrides. The shared layer is read even for an unsynced namespace.
 */
export const resolve = (settings: Snapshot, namespace: string, defaults?: Values): Values => ({
  ...defaults,
  ...settings.shared[namespace],
  ...getOverrides(settings, namespace),
});

/** Mutable view of {@link Snapshot}. Call the mutators inside `Obj.update(settings, ...)`. */
export type Draft = {
  shared: Namespaces;
  local: DeviceSettings;
};

const namespaceOf = (container: Namespaces, namespace: string): Values => (container[namespace] ??= {});

/**
 * Write `key` to whichever layer owns it: this device's overrides when the namespace is unsynced or
 * the key is already overridden, the shared layer otherwise.
 */
export const setValue = (draft: Draft, namespace: string, key: string, value: unknown): void => {
  const local = !isSynced(draft, namespace) || isOverridden(draft, namespace, key);
  const target = local ? namespaceOf(draft.local.overrides, namespace) : namespaceOf(draft.shared, namespace);
  target[key] = value;
};

/** Remove `key` from both layers, so it falls back to the plugin's schema default. */
export const clearValue = (draft: Draft, namespace: string, key: string): void => {
  delete draft.shared[namespace]?.[key];
  delete draft.local.overrides[namespace]?.[key];
};

/** Which side wins for the keys that {@link conflictingKeys} reports, when rejoining the account. */
export type Adopt = 'shared' | 'local';

export type SetSyncedOptions = {
  /** Values in effect here, frozen into the device layer when leaving. Omit to diverge from the next write on. */
  snapshot?: Values;
  /** Which side wins when rejoining, for the keys {@link conflictingKeys} reports. */
  adopt?: Adopt;
};

/** Turn sharing of a namespace on or off for this device. */
export const setSynced = (
  draft: Draft,
  namespace: string,
  synced: boolean,
  { snapshot, adopt = 'shared' }: SetSyncedOptions = {},
): void => {
  if (synced) {
    const overrides = draft.local.overrides[namespace];
    if (overrides && Object.keys(overrides).length > 0) {
      const shared = namespaceOf(draft.shared, namespace);
      draft.shared[namespace] = adopt === 'local' ? { ...shared, ...overrides } : { ...overrides, ...shared };
    }
    draft.local.unsynced = draft.local.unsynced.filter((entry) => entry !== namespace);
    delete draft.local.overrides[namespace];
  } else {
    if (!draft.local.unsynced.includes(namespace)) {
      draft.local.unsynced = [...draft.local.unsynced, namespace];
    }
    if (snapshot) {
      draft.local.overrides[namespace] = { ...snapshot };
    }
  }
};

/**
 * Pin one key to this device, or hand it back to the account.
 *
 * `snapshot` is the value in effect: a key still on its schema default is absent from both layers,
 * and pinning it must capture the default rather than nothing.
 */
export const setKeySynced = (
  draft: Draft,
  namespace: string,
  key: string,
  synced: boolean,
  snapshot?: unknown,
): void => {
  if (synced) {
    delete draft.local.overrides[namespace]?.[key];
  } else {
    namespaceOf(draft.local.overrides, namespace)[key] = snapshot;
  }
};

const differs = (a: unknown, b: unknown): boolean => !Object.is(a, b) && JSON.stringify(a) !== JSON.stringify(b);

/** Keys whose value differs between two records, including keys present in only one. */
export const changedKeys = (before: Values, after: Values): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => differs(before[key], after[key]));

/** Keys where rejoining the account forces a choice, because both sides hold the key and disagree. */
export const conflictingKeys = (settings: Snapshot, namespace: string): string[] => {
  const overrides = getOverrides(settings, namespace);
  const shared = settings.shared[namespace] ?? {};
  return Object.keys(overrides).filter((key) => key in shared && differs(overrides[key], shared[key]));
};

/** Route every changed key of a resolved-value edit to its owning layer; dropped keys are cleared from both. */
export const applyResolved = (draft: Draft, namespace: string, before: Values, after: Values): void => {
  for (const key of changedKeys(before, after)) {
    if (key in after) {
      setValue(draft, namespace, key, after[key]);
    } else {
      clearValue(draft, namespace, key);
    }
  }
};

/** Ids whose decision under {@link PLUGINS_NAMESPACE} resolves to enabled. */
export const getEnabledPlugins = (decisions: Values): string[] =>
  Object.keys(decisions).filter((id) => decisions[id] === true);
