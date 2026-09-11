//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Database, DXN, Obj, Query, Ref, Type } from '@dxos/echo';

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
 * account entirely. Records only WHICH: the values are in each namespace's own local store.
 */
export const DeviceSettings = Schema.Record(Schema.String, Schema.mutableKey(Pin));

/** App configuration that replicates across a user's devices. */
export class AppSettings extends Type.makeObject<AppSettings>(DXN.make('org.dxos.app.type.settings', '0.1.0'))(
  Schema.Struct({
    /** Values in effect on every device unless a device pins them. */
    shared: Namespaces,
  }),
) {}

/** Create an empty settings object. */
export const make = (): AppSettings => Obj.make(AppSettings, { shared: {} });

/** Names the space's settings object on its `properties`, so every device writes through one. */
export const AppSettingsAnnotation = Annotation.make({
  id: 'org.dxos.space.appSettings',
  schema: Ref.Ref(AppSettings),
});

/**
 * The space's settings object, named on `properties` on first use.
 *
 * A query cannot settle this alone: it does not subscribe, so two devices that both run before
 * replication each find nothing and each create one. Anything the name does not cover is folded in.
 */
export const open = Effect.fnUntraced(function* () {
  const [properties] = yield* Database.query(Query.type(SpaceProperties)).run;
  const named = properties ? Annotation.get(properties, AppSettingsAnnotation).pipe(Option.getOrUndefined) : undefined;

  const objects = yield* Database.query(Query.type(AppSettings)).run;
  const settings = named
    ? yield* Database.load(named)
    : ([...objects].sort((left, right) => left.id.localeCompare(right.id))[0] ?? (yield* Database.add(make())));

  for (const other of objects.filter((object) => object.id !== settings.id)) {
    const loser = Obj.getSnapshot(other).shared;
    Obj.update(settings, (settings) => mergeShared(settings.shared, loser));
  }

  if (properties && !named) {
    Obj.update(properties, (properties) => {
      Annotation.set(properties, AppSettingsAnnotation, Ref.make(settings));
    });
  }

  return settings;
});

/** Create an empty device layer, for the local store's initial value. */
export const makeDeviceSettings = (): DeviceSettings => ({});

/** Mutable field values for one namespace. */
export type Values = Record<string, unknown>;

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

/** Whether a stored value is an install the loader can act on. */
export const isInstalledPlugin = (value: unknown): value is InstalledPlugin =>
  typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string';

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
 * device pins a key. `local` is the namespace's own store.
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

/**
 * The namespace's record, created empty if absent.
 *
 * Read back rather than returned from the assignment: `??=` yields the plain object it assigned, and
 * `container` is an ECHO proxy in a live draft, so writing through that would land on a detached
 * object and lose the first key in every new namespace.
 */
const namespaceOf = (container: Namespaces, namespace: string): Values => {
  container[namespace] ??= {};
  return container[namespace];
};

const pinOf = (draft: Draft, namespace: string): Pin => (draft.local[namespace] ??= { local: false, keys: [] });

/** Route a write to the account, or record that this device keeps the key. */
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
  unpinKey(draft, namespace, key);
};

/** Which side wins for the keys that {@link conflictingKeys} reports, when rejoining the account. */
export type Adopt = 'shared' | 'local';

/**
 * Take a namespace off the account for this device. Lossless, and no other device is touched.
 *
 * `freeze` pins every key in `local`, so the switch is a visible no-op; without it the namespace
 * diverges from the next write on.
 */
export const takeLocal = (draft: Draft, namespace: string, local: Values, { freeze = false } = {}): void => {
  draft.local[namespace] = {
    local: true,
    keys: freeze ? Object.keys(local) : getPinnedKeys(draft, namespace).slice(),
  };
};

/**
 * Hand a namespace back to the account — the one direction that can discard a value, and only for
 * the keys {@link conflictingKeys} reports, where `adopt` picks the side that survives.
 */
export const rejoinAccount = (
  draft: Draft,
  namespace: string,
  local: Values,
  { adopt = 'shared' }: { adopt?: Adopt } = {},
): void => {
  const shared = namespaceOf(draft.shared, namespace);
  for (const key of getPinnedKeys(draft, namespace)) {
    if (key in local && (adopt === 'local' || !(key in shared))) {
      shared[key] = local[key];
    }
  }

  delete draft.local[namespace];
};

/** Keep one key on this device — the per-key counterpart of {@link takeLocal}. */
export const pinKey = (draft: Draft, namespace: string, key: string): void => {
  const pin = pinOf(draft, namespace);
  if (!pin.keys.includes(key)) {
    pin.keys.push(key);
  }
};

/** Hand one key back to the account — the per-key counterpart of {@link rejoinAccount}. */
export const unpinKey = (draft: Draft, namespace: string, key: string): void => {
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
 * Route every changed key of a resolved-value edit to its owning layer. A dropped key is cleared
 * only where the write would have reached the account anyway.
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

/** Fold a loser's values in: a key only it holds is adopted, a key both hold keeps the winner's. */
export const mergeShared = (winner: Namespaces, loser: Namespaces): void => {
  for (const [namespace, values] of Object.entries(loser)) {
    const target = namespaceOf(winner, namespace);
    for (const [key, value] of Object.entries(values)) {
      if (!(key in target)) {
        target[key] = value;
      }
    }
  }
};

/** Ids whose decision under {@link PLUGINS_NAMESPACE} resolves to enabled. */
export const getEnabledPlugins = (decisions: Values): string[] =>
  Object.keys(decisions).filter((id) => decisions[id] === true);
