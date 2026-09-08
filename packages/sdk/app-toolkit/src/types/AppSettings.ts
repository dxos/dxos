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

/**
 * This device's own settings layer, persisted locally and never replicated.
 *
 * It stays out of ECHO because nothing else can act on it: every read is by the device that wrote
 * it. Replicating it would hand every other device a copy it cannot use, keep machine-specific
 * values (a local model endpoint, say) on machines they do not describe, and leave an override set
 * stranded whenever a re-created profile takes a new device key.
 */
export const DeviceSettings = Schema.Struct({
  /**
   * Values this device overrides. A key's PRESENCE is the override, not its value — an overridden
   * key whose value equals the shared one must stay local when another device changes the shared one.
   */
  overrides: Schema.mutableKey(Schema.Record(Schema.String, Schema.mutableKey(Values))),
  /**
   * Namespaces whose WRITES go to this device's overrides instead of the shared layer. Reads still
   * layer shared underneath, so a key this device has never written keeps following the account.
   */
  unsynced: Schema.mutable(Schema.Array(Schema.String)),
});

/**
 * App configuration that replicates across a user's devices.
 *
 * A singleton in the settings space (`AppSpace.SETTINGS_SPACE_TAG`): hidden, membership-locked and
 * EDGE-replicated, so this follows the identity and is never shared with anyone else. It holds only
 * the shared layer; see {@link DeviceSettings} for the half that stays on the device.
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

/** Mutable counterpart of {@link DeviceSettings}. */
export type DeviceSettings = { overrides: Namespaces; unsynced: string[] };

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
// Pure over a plain snapshot so the merge rules can be tested without a database. A snapshot pairs
// the replicated layer with this device's own; the acting device is implicit, because the local
// layer only ever belongs to it.
//

/**
 * Shape the resolution helpers read. Structural so the live ECHO proxy satisfies `shared` and the
 * local store's atom value satisfies `local`.
 */
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

/**
 * Whether this device holds its own value for one key, so edits to it stay here even while the rest
 * of the namespace follows the account.
 *
 * Presence is the override, not the value: a key pinned to what the account currently says must stay
 * pinned when another device changes it.
 */
export const isOverridden = (settings: Snapshot, namespace: string, key: string): boolean =>
  key in getOverrides(settings, namespace);

/**
 * Whether one key's edits reach the user's other devices — the per-key counterpart of
 * {@link isSynced}, and what a control offering to pin a single key reads.
 */
export const isKeySynced = (settings: Snapshot, namespace: string, key: string): boolean =>
  isSynced(settings, namespace) && !isOverridden(settings, namespace, key);

/**
 * The values in effect on this device: `defaults`, overlaid with the shared values, overlaid with
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
export const resolve = (settings: Snapshot, namespace: string, defaults?: Values): Values => ({
  ...defaults,
  ...settings.shared[namespace],
  ...getOverrides(settings, namespace),
});

//
// Mutation.
//
// Each takes a mutable draft — call inside `Obj.update(settings, (draft) => ...)`.
//

/**
 * Mutable view of {@link Snapshot}. `shared` is handed to an `Obj.update` callback; `local` is a
 * mutable copy the caller writes back to the device store afterwards.
 */
export type Draft = {
  shared: Namespaces;
  local: DeviceSettings;
};

const namespaceOf = (container: Namespaces, namespace: string): Values => (container[namespace] ??= {});

/**
 * Write `key` to whichever layer owns it: this device's overrides when the namespace is unsynced,
 * the shared layer otherwise. This is the routing rule that makes settings shared by default.
 */
export const setValue = (draft: Draft, namespace: string, key: string, value: unknown): void => {
  // A key already overridden keeps taking writes here even while the namespace follows the account:
  // that is what lets one plugin be pinned to this device without forking the whole set. The same
  // rule reads follow — presence in the device layer is the override, whatever its value.
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
  namespace: string,
  synced: boolean,
  { snapshot, adopt = 'shared' }: SetSyncedOptions = {},
): void => {
  if (synced) {
    const overrides = draft.local.overrides[namespace];
    if (overrides && Object.keys(overrides).length > 0) {
      // Rejoining merges on the same rule as the first reconciliation: a key only one side holds is
      // adopted, since the other has no competing opinion and nothing is lost by keeping it. `adopt`
      // therefore decides only the keys both sides hold and disagree on — the ones the reader was
      // asked about.
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
 * Pinning is lossless: it freezes the value already in effect, so nothing visibly changes here and
 * no other device is touched. Unpinning drops this device's value for the key, which is only a loss
 * where the two sides disagree — {@link conflictingKeys} names those, so a caller can ask first.
 *
 * `snapshot` is the value in effect, which the caller has to supply: a key still on its schema
 * default is absent from both layers, and pinning it must capture the default rather than nothing.
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
export const conflictingKeys = (settings: Snapshot, namespace: string): string[] => {
  const overrides = getOverrides(settings, namespace);
  const shared = settings.shared[namespace] ?? {};
  return Object.keys(overrides).filter((key) => key in shared && differs(overrides[key], shared[key]));
};

/**
 * Apply a resolved-value edit back to the layered store: every key that changed is routed to its
 * owning layer, and keys the caller dropped entirely are cleared from both.
 */
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
