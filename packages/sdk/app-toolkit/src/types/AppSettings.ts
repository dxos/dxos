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

/** One of the user's devices, and the settings it has pinned locally. */
export const Device = Schema.Struct({
  /** Human-readable device label, for the UI that lists override sets. */
  label: Schema.optional(Schema.String),
  /**
   * Values this device overrides. A key's PRESENCE is the override, not its value — a pinned key
   * whose value equals the shared one must stay pinned when another device changes the shared one.
   */
  overrides: Namespaces,
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
  readonly devices: Record<string, { readonly overrides: Namespaces }>;
};

/** Values this device has pinned in a namespace. Empty when the device pins nothing. */
export const getOverrides = (settings: Snapshot, deviceKey: string, namespace: string): Values =>
  settings.devices[deviceKey]?.overrides[namespace] ?? {};

/** Whether `key` is pinned to a device-local value. */
export const isPinned = (settings: Snapshot, deviceKey: string, namespace: string, key: string): boolean =>
  key in getOverrides(settings, deviceKey, namespace);

/** Keys pinned to a device-local value in a namespace. */
export const getPinnedKeys = (settings: Snapshot, deviceKey: string, namespace: string): string[] =>
  Object.keys(getOverrides(settings, deviceKey, namespace));

/**
 * The values in effect on `deviceKey`: `defaults`, overlaid with the shared values, overlaid with
 * this device's overrides.
 *
 * `defaults` carries whatever the store has no opinion on — a plugin's schema defaults, or the
 * device's own state for a plugin no other device has heard of. A key absent from both layers
 * therefore keeps following the device rather than being forced to nothing.
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
  devices: Record<string, { label?: string; overrides: Namespaces }>;
};

const namespaceOf = (container: Namespaces, namespace: string): Values => (container[namespace] ??= {});

const deviceOf = (draft: Draft, deviceKey: string) => (draft.devices[deviceKey] ??= { overrides: {} });

/**
 * Write `key` to whichever layer owns it: the device layer when pinned, the shared layer otherwise.
 * This is the routing rule that makes settings shared by default.
 */
export const setValue = (draft: Draft, deviceKey: string, namespace: string, key: string, value: unknown): void => {
  const target = isPinned(draft, deviceKey, namespace, key)
    ? namespaceOf(deviceOf(draft, deviceKey).overrides, namespace)
    : namespaceOf(draft.shared, namespace);
  target[key] = value;
};

/** Remove `key` from both layers, so it falls back to the plugin's schema default. */
export const clearValue = (draft: Draft, deviceKey: string, namespace: string, key: string): void => {
  delete draft.shared[namespace]?.[key];
  delete draft.devices[deviceKey]?.overrides[namespace]?.[key];
};

/**
 * Pin `key` to this device. `value` is the value currently in effect, seeded into the override so
 * that pinning alone never changes what the user sees.
 */
export const pin = (draft: Draft, deviceKey: string, namespace: string, key: string, value: unknown): void => {
  namespaceOf(deviceOf(draft, deviceKey).overrides, namespace)[key] = value;
};

/** Release `key` back to the shared value. */
export const unpin = (draft: Draft, deviceKey: string, namespace: string, key: string): void => {
  delete draft.devices[deviceKey]?.overrides[namespace]?.[key];
};

/** Record a device's label so override sets can be attributed in the UI. */
export const setDeviceLabel = (draft: Draft, deviceKey: string, label: string): void => {
  deviceOf(draft, deviceKey).label = label;
};

//
// Diffing.
//

/** Keys whose value differs between two records, including keys present in only one. */
export const changedKeys = (before: Values, after: Values): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => !Object.is(before[key], after[key]) && JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );

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
