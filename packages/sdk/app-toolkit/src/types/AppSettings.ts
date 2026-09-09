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

/** How one namespace departs from the account on this device. */
export const Pin = Schema.Struct({
  /** Writes to this namespace stay here, including keys that do not exist yet. */
  local: Schema.Boolean,
  /** Keys whose value on this device wins over the account's. */
  keys: Schema.mutable(Schema.Array(Schema.String)),
});

/**
 * Which settings this device keeps to itself, by namespace. Absent means the namespace follows the
 * account entirely.
 *
 * Records only WHICH settings are pinned. The values themselves are already in each namespace's own
 * local store, which is what the app renders from, so a second copy could only go stale.
 */
export const DeviceSettings = Schema.Record(Schema.String, Schema.mutableKey(Pin));

/**
 * App configuration that replicates across a user's devices.
 *
 * A singleton in the settings space (`AppSpace.SETTINGS_SPACE_TAG`), which is hidden and
 * membership-locked; see {@link DeviceSettings} for what stays on the device.
 */
export class AppSettings extends Type.makeObject<AppSettings>(DXN.make('org.dxos.app.type.settings', '0.1.0'))(
  Schema.Struct({
    /** Values in effect on every device unless a device pins them. */
    shared: Namespaces,
  }),
) {}

/** Create an empty settings object. */
export const make = (): AppSettings => Obj.make(AppSettings, { shared: {} });

/** Create an empty device layer, for the local store's initial value. */
export const makeDeviceSettings = (): DeviceSettings => ({});

/** Mutable field values for one namespace. */
export type Values = Record<string, any>;

/** Values for every namespace, keyed by namespace id. Mutable counterpart of {@link Namespaces}. */
export type Namespaces = Record<string, Values>;

/** Mutable counterpart of {@link Pin}. */
export type Pin = { local: boolean; keys: string[] };

/** Mutable counterpart of {@link DeviceSettings}. */
export type DeviceSettings = Record<string, Pin>;

/** The plugin set, keyed by plugin id: present means decided, `true` means enabled. */
export const PLUGINS_NAMESPACE = 'org.dxos.app-framework.plugins';

/** Plugins installed from a URL, keyed by plugin id with an {@link InstalledPlugin} value. */
export const INSTALLED_NAMESPACE = 'org.dxos.app-framework.plugins.installed';

/** Value shape stored under {@link INSTALLED_NAMESPACE}. */
export type InstalledPlugin = { id: string; url: string; version?: string };

/** Shape the resolution helpers read: the replicated layer paired with this device's pins. */
export type Snapshot = {
  readonly shared: Namespaces;
  readonly local: DeviceSettings;
};

/** Keys this device pins in a namespace. */
export const getPinnedKeys = (settings: Snapshot, namespace: string): readonly string[] =>
  settings.local[namespace]?.keys ?? [];

/** Namespaces this device writes locally rather than sharing. */
export const getUnsynced = (settings: Snapshot): readonly string[] =>
  Object.keys(settings.local).filter((namespace) => settings.local[namespace].local);

/** Whether edits to `namespace` on this device are shared with the user's other devices. */
export const isSynced = (settings: Snapshot, namespace: string): boolean => !settings.local[namespace]?.local;

/** Whether this device pins one key, so the account's value for it is ignored. */
export const isPinned = (settings: Snapshot, namespace: string, key: string): boolean =>
  getPinnedKeys(settings, namespace).includes(key);

/** Whether one key's edits reach the user's other devices — the per-key counterpart of {@link isSynced}. */
export const isKeySynced = (settings: Snapshot, namespace: string, key: string): boolean =>
  isSynced(settings, namespace) && !isPinned(settings, namespace, key);

/**
 * The values in effect on this device: `local` overlaid with the shared values, except where this
 * device pins a key and keeps its own.
 *
 * `local` is the namespace's own store — both the base for keys the account has no opinion on, and
 * the source for pinned ones.
 */
export const resolve = (settings: Snapshot, namespace: string, local: Values = {}): Values => {
  const resolved: Values = { ...local, ...settings.shared[namespace] };
  for (const key of getPinnedKeys(settings, namespace)) {
    if (key in local) {
      resolved[key] = local[key];
    }
  }

  return resolved;
};

/** Mutable view of {@link Snapshot}. Call the mutators inside `Obj.update(settings, ...)`. */
export type Draft = {
  shared: Namespaces;
  local: DeviceSettings;
};

const namespaceOf = (container: Namespaces, namespace: string): Values => (container[namespace] ??= {});

const pinOf = (draft: Draft, namespace: string): Pin => (draft.local[namespace] ??= { local: false, keys: [] });

/**
 * Route a write to the account, or record that this device keeps the key.
 *
 * A pinned key's value is not stored here: it is already in the namespace's own store, which is
 * where every reader gets it from.
 */
export const setValue = (draft: Draft, namespace: string, key: string, value: unknown): void => {
  if (isSynced(draft, namespace) && !isPinned(draft, namespace, key)) {
    namespaceOf(draft.shared, namespace)[key] = value;
    return;
  }

  const pin = pinOf(draft, namespace);
  if (!pin.keys.includes(key)) {
    pin.keys.push(key);
  }
};

/** Stop sharing `key`, and drop any pin, so it falls back to the namespace's own store. */
export const clearValue = (draft: Draft, namespace: string, key: string): void => {
  delete draft.shared[namespace]?.[key];
  unpin(draft, namespace, key);
};

/** Which side wins for the keys that {@link conflictingKeys} reports, when rejoining the account. */
export type Adopt = 'shared' | 'local';

export type SetSyncedOptions = {
  /** Pin every key in `local` when leaving. Omit to diverge from the next write on. */
  freeze?: boolean;
  /** Which side wins when rejoining, for the keys {@link conflictingKeys} reports. */
  adopt?: Adopt;
};

/**
 * Turn sharing of a namespace on or off for this device.
 *
 * `local` is the namespace's own store, which holds the values either direction acts on.
 */
export const setSynced = (
  draft: Draft,
  namespace: string,
  synced: boolean,
  local: Values,
  { freeze, adopt = 'shared' }: SetSyncedOptions = {},
): void => {
  if (!synced) {
    draft.local[namespace] = {
      local: true,
      keys: freeze ? Object.keys(local) : getPinnedKeys(draft, namespace).slice(),
    };
    return;
  }

  // A pinned key the account does not hold is adopted whichever side wins: the account has no
  // competing opinion, so nothing is lost by keeping it. `adopt` decides only the rest, which is
  // what {@link conflictingKeys} reports and what the reader was asked about.
  const shared = namespaceOf(draft.shared, namespace);
  for (const key of getPinnedKeys(draft, namespace)) {
    if (key in local && (adopt === 'local' || !(key in shared))) {
      shared[key] = local[key];
    }
  }

  delete draft.local[namespace];
};

/**
 * Pin one key to this device, or hand it back to the account.
 *
 * Nothing is copied either way: pinning records the key, and the value it pins is the one already in
 * the namespace's own store.
 */
export const setKeySynced = (draft: Draft, namespace: string, key: string, synced: boolean): void => {
  if (synced) {
    unpin(draft, namespace, key);
    return;
  }

  const pin = pinOf(draft, namespace);
  if (!pin.keys.includes(key)) {
    pin.keys.push(key);
  }
};

const unpin = (draft: Draft, namespace: string, key: string): void => {
  const pin = draft.local[namespace];
  if (!pin) {
    return;
  }

  pin.keys = pin.keys.filter((entry) => entry !== key);
  if (!pin.local && pin.keys.length === 0) {
    delete draft.local[namespace];
  }
};

const differs = (a: unknown, b: unknown): boolean => !Object.is(a, b) && JSON.stringify(a) !== JSON.stringify(b);

/** Keys whose value differs between two records, including keys present in only one. */
export const changedKeys = (before: Values, after: Values): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => differs(before[key], after[key]));

/** Keys where rejoining the account forces a choice, because both sides hold the key and disagree. */
export const conflictingKeys = (settings: Snapshot, namespace: string, local: Values): string[] => {
  const shared = settings.shared[namespace] ?? {};
  return getPinnedKeys(settings, namespace).filter((key) => key in shared && differs(local[key], shared[key]));
};

/**
 * Route every changed key of a resolved-value edit to its owning layer.
 *
 * A dropped key is cleared only where the write would have reached the account anyway. Dropping a
 * key this device keeps is a local event, and the account's value is not this device's to delete.
 */
export const applyResolved = (draft: Draft, namespace: string, before: Values, after: Values): void => {
  for (const key of changedKeys(before, after)) {
    if (key in after) {
      setValue(draft, namespace, key, after[key]);
    } else if (isSynced(draft, namespace) && !isPinned(draft, namespace, key)) {
      clearValue(draft, namespace, key);
    }
  }
};

/** Ids whose decision under {@link PLUGINS_NAMESPACE} resolves to enabled. */
export const getEnabledPlugins = (decisions: Values): string[] =>
  Object.keys(decisions).filter((id) => decisions[id] === true);
