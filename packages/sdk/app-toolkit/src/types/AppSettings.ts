//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/**
 * Values for a single settings namespace, keyed by field name.
 *
 * `Schema.Any` because a namespace holds whatever its contributing plugin's settings schema
 * declares; the schema that validates a namespace lives with the plugin, not here.
 */
export const Values = Schema.Record(Schema.String, Schema.Any);

/** Values for every namespace, keyed by namespace id. */
export const Namespaces = Schema.Record(Schema.String, Values);

/** One of the user's devices, and the settings it keeps to itself. */
export const Device = Schema.Struct({
  /** Human-readable device label, for the UI that attributes override sets. */
  label: Schema.optional(Schema.String),
  /**
   * Values this device overrides. A key's PRESENCE is the override, not its value — an overridden
   * key whose value equals the shared one must stay local when another device changes the shared one.
   */
  overrides: Namespaces,
  /**
   * Namespaces whose WRITES go to this device's overrides instead of the shared layer. Reads still
   * layer shared underneath, so a key this device has never written keeps following the account.
   */
  unsynced: Schema.Array(Schema.String),
});

/**
 * App configuration that replicates across a user's devices.
 *
 * A singleton in the settings space (`AppSpace.SETTINGS_SPACE_TAG`): hidden, membership-locked and
 * EDGE-replicated, so this follows the identity and is never shared with anyone else.
 */
export class AppSettings extends Type.makeObject<AppSettings>(DXN.make('org.dxos.app.type.settings', '0.1.0'))(
  Schema.Struct({
    /** Values in effect on every device unless a device overrides them. */
    shared: Namespaces,
    /** Per-device override sets, keyed by device key (hex). */
    devices: Schema.Record(Schema.String, Device),
  }),
) {}

/** Create an empty settings object. */
export const make = (): AppSettings => Obj.make(AppSettings, { shared: {}, devices: {} });

/**
 * Field values for one namespace.
 *
 * Declared rather than inferred from {@link Values}: the schema's index signature is readonly and
 * every helper below writes into a draft. `any` (not `unknown`) so a plugin's own settings
 * interface — optional fields, no index signature — satisfies the `T extends Values` bound.
 */
export type Values = Record<string, any>;

/** Values for every namespace, keyed by namespace id. Mutable counterpart of {@link Namespaces}. */
export type Namespaces = Record<string, Values>;

//
// Well-known namespaces.
//

/**
 * The plugin set, keyed by plugin id with a boolean value: present means the user has made a
 * decision about the plugin, `true` means enabled. Plugin id as the key (rather than one
 * `enabled: string[]` field) is what makes a device override affect a single plugin instead of
 * replacing the whole list — a list-valued override would swallow every plugin another device
 * enables afterwards.
 */
export const PLUGINS_NAMESPACE = 'org.dxos.app-framework.plugins';

/**
 * Plugins installed from a URL, keyed by plugin id with an {@link InstalledPlugin} value.
 * Mirrors `@dxos/app-framework`'s `UrlLoader.RemotePluginView` records, which are read during
 * preload — before the client exists — so this namespace is written through to that local store and
 * takes effect on the next reload.
 */
export const INSTALLED_NAMESPACE = 'org.dxos.app-framework.plugins.installed';

/** Value shape stored under {@link INSTALLED_NAMESPACE}. */
export type InstalledPlugin = { id: string; url: string; version?: string };

//
// Resolution.
//
// Pure over a plain snapshot so the merge rules can be tested without a database. Every reader
// takes the settings object (live proxy or snapshot) plus the acting device key.
//

/** Shape the resolution helpers read. Structural so both the live proxy and a snapshot satisfy it. */
export type Snapshot = {
  readonly shared: Namespaces;
  readonly devices: Record<string, { readonly overrides: Namespaces; readonly unsynced?: readonly string[] }>;
};

/** Values this device overrides in a namespace. Empty when the device overrides nothing. */
export const getOverrides = (settings: Snapshot, deviceKey: string, namespace: string): Values =>
  settings.devices[deviceKey]?.overrides[namespace] ?? {};

/** Namespaces this device writes locally rather than sharing. */
export const getUnsynced = (settings: Snapshot, deviceKey: string): readonly string[] =>
  settings.devices[deviceKey]?.unsynced ?? [];

/** Whether edits to `namespace` on this device are shared with the user's other devices. */
export const isSynced = (settings: Snapshot, deviceKey: string, namespace: string): boolean =>
  !getUnsynced(settings, deviceKey).includes(namespace);

/**
 * The values in effect on `deviceKey`: `defaults`, overlaid with the shared values, overlaid with
 * this device's overrides.
 *
 * The shared layer is read even for an unsynced namespace — {@link isSynced} governs where writes
 * GO, not what reads see. That is what keeps an unsynced namespace soft: a key this device has
 * never written has no override, so it still follows the account.
 *
 * `defaults` carries whatever the store has no opinion on — a plugin's schema defaults, or a plugin
 * no other device has heard of — so such a key follows the device rather than being forced to
 * nothing.
 */
export const resolve = (settings: Snapshot, deviceKey: string, namespace: string, defaults?: Values): Values => ({
  ...defaults,
  ...settings.shared[namespace],
  ...getOverrides(settings, deviceKey, namespace),
});

//
// Mutation.
//
// Each takes a mutable draft — call inside `Obj.update(settings, (draft) => ...)`.
//

/** Mutable view of {@link Snapshot}, as handed to an `Obj.update` callback. */
export type Draft = {
  shared: Namespaces;
  devices: Record<string, { label?: string; overrides: Namespaces; unsynced: string[] }>;
};

const namespaceOf = (container: Namespaces, namespace: string): Values => (container[namespace] ??= {});

const deviceOf = (draft: Draft, deviceKey: string) => {
  const device = (draft.devices[deviceKey] ??= { overrides: {}, unsynced: [] });
  // Entries written before `unsynced` existed lack the field, and every caller below mutates it.
  device.unsynced ??= [];
  return device;
};

/**
 * Write `key` to whichever layer owns it: this device's overrides when the namespace is unsynced,
 * the shared layer otherwise. This is the routing rule that makes settings shared by default.
 */
export const setValue = (draft: Draft, deviceKey: string, namespace: string, key: string, value: unknown): void => {
  const target = isSynced(draft, deviceKey, namespace)
    ? namespaceOf(draft.shared, namespace)
    : namespaceOf(deviceOf(draft, deviceKey).overrides, namespace);
  target[key] = value;
};

/** Remove `key` from both layers, so it falls back to the plugin's schema default. */
export const clearValue = (draft: Draft, deviceKey: string, namespace: string, key: string): void => {
  delete draft.shared[namespace]?.[key];
  delete draft.devices[deviceKey]?.overrides[namespace]?.[key];
};

/** Which side wins for the keys that {@link conflictingKeys} reports, when rejoining the account. */
export type Adopt = 'shared' | 'local';

export type SetSyncedOptions = {
  /**
   * Values in effect here, frozen into the device layer when LEAVING so nothing visibly changes.
   * Omit to diverge only from the next write onwards — what the plugin set wants, so plugins
   * enabled elsewhere later still arrive.
   */
  snapshot?: Values;
  /**
   * Which side wins when REJOINING. `shared` (the default) discards this device's values; `local`
   * publishes them to the account, overwriting the shared value for every key this device holds.
   * Only matters where the two differ — see {@link conflictingKeys}.
   */
  adopt?: Adopt;
};

/**
 * Turn sharing of a namespace on or off for this device.
 *
 * Turning it OFF is lossless and touches no other device. Turning it ON drops this device's copy;
 * with `adopt: 'local'` that copy is published to the account first, so nothing is lost either way
 * and only the losing side of a genuine conflict disappears.
 */
export const setSynced = (
  draft: Draft,
  deviceKey: string,
  namespace: string,
  synced: boolean,
  { snapshot, adopt = 'shared' }: SetSyncedOptions = {},
): void => {
  const device = deviceOf(draft, deviceKey);
  if (synced) {
    const overrides = device.overrides[namespace];
    if (overrides && Object.keys(overrides).length > 0) {
      // Rejoining merges on the same rule as the first reconciliation: a key only one side holds is
      // adopted, since the other has no competing opinion and nothing is lost by keeping it. `adopt`
      // therefore decides only the keys both sides hold and disagree on — the ones the reader was
      // asked about.
      const shared = namespaceOf(draft.shared, namespace);
      draft.shared[namespace] = adopt === 'local' ? { ...shared, ...overrides } : { ...overrides, ...shared };
    }
    device.unsynced = device.unsynced.filter((entry) => entry !== namespace);
    delete device.overrides[namespace];
  } else {
    if (!device.unsynced.includes(namespace)) {
      device.unsynced = [...device.unsynced, namespace];
    }
    if (snapshot) {
      device.overrides[namespace] = { ...snapshot };
    }
  }
};

/** Record a device's label so override sets can be attributed in the UI. */
export const setDeviceLabel = (draft: Draft, deviceKey: string, label: string): void => {
  deviceOf(draft, deviceKey).label = label;
};

//
// Diffing.
//

const differs = (a: unknown, b: unknown): boolean => !Object.is(a, b) && JSON.stringify(a) !== JSON.stringify(b);

/** Keys whose value differs between two records, including keys present in only one. */
export const changedKeys = (before: Values, after: Values): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => differs(before[key], after[key]));

/**
 * Keys where rejoining the account forces a choice, because both sides hold the key and disagree.
 *
 * A key only one side holds is not among them: rejoining adopts it, so nothing is lost whichever
 * direction the reader picks. Nor is an override equal to the shared value. Empty therefore means
 * rejoining is lossless and there is nothing to put to the reader.
 */
export const conflictingKeys = (settings: Snapshot, deviceKey: string, namespace: string): string[] => {
  const overrides = getOverrides(settings, deviceKey, namespace);
  const shared = settings.shared[namespace] ?? {};
  return Object.keys(overrides).filter((key) => key in shared && differs(overrides[key], shared[key]));
};

/**
 * Apply a resolved-value edit back to the layered store: every key that changed is routed to its
 * owning layer, and keys the caller dropped entirely are cleared from both.
 */
export const applyResolved = (
  draft: Draft,
  deviceKey: string,
  namespace: string,
  before: Values,
  after: Values,
): void => {
  for (const key of changedKeys(before, after)) {
    if (key in after) {
      setValue(draft, deviceKey, namespace, key, after[key]);
    } else {
      clearValue(draft, deviceKey, namespace, key);
    }
  }
};

/** Ids whose decision under {@link PLUGINS_NAMESPACE} resolves to enabled. */
export const getEnabledPlugins = (decisions: Values): string[] =>
  Object.keys(decisions).filter((id) => decisions[id] === true);
