//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type { ComponentType } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { type Space } from '@dxos/client/echo';
import type * as Operation from '@dxos/compute/Operation';
import { type Collection, type Database, type Obj, type Type } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';
import { type Label } from '@dxos/ui-types/translations';
import { type ComplexMap, type Position } from '@dxos/util';

import { type SpaceDashboard } from '#dashboard';
import { meta } from '#meta';

import * as Settings from './Settings';
import * as SpaceSchema from './SpaceSchema';

export const SettingsAtom = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** Schema for persisted space plugin state. */
export const StateSchema = Schema.Struct({
  spaceNames: Schema.Record(Schema.String, Schema.String),
  enabledEdgeReplication: Schema.Boolean,
}).mapFields(Struct.map(Schema.mutableKey));

export type SpaceState = Schema.Schema.Type<typeof StateSchema>;

/** Persisted state (stored in KVS/localStorage). */
export const State = Capability.makeSingleton<Atom.Writable<SpaceState>>()(`${meta.profile.key}.capability.state`);

/**
 * A proposed merge awaiting confirmation. `preview` is detached (never added to the database),
 * so abandoning the review writes nothing. Keyed by the type article's URI so the companion
 * only shows a preview raised by the plank it is companion to.
 */
export type MergePreview = {
  typeUri: string;
  typename: string;
  objectIds: string[];
  preview: Obj.Unknown;
};

/** Ephemeral space plugin state (not persisted). */
export type SpaceEphemeralState = {
  awaiting: string | undefined;
  sdkMigrationRunning: Record<string, boolean>;
  navigableCollections: boolean;
  viewersByObject: Record<string, ComplexMap<PublicKey, SpaceSchema.ObjectViewerProps>>;
  viewersByIdentity: ComplexMap<PublicKey, Set<string>>;
  mergePreview: MergePreview | undefined;
  /** Bumped when a merge commits, so an open duplicates review knows to rescan. */
  lastMergeAt: number | undefined;
};

/** Transient/ephemeral state (not persisted). */
export const EphemeralState = Capability.makeSingleton<Atom.Writable<SpaceEphemeralState>>()(
  `${meta.profile.key}.capability.ephemeralState`,
);

/**
 * The active space projected for peripheral displays (Stream Deck, LaMetric).
 *
 * Contributed here rather than by each device plugin so that one set of queries serves every
 * attached device, and so that `plugin-space` needs no knowledge of what is attached: it publishes
 * facts, and slot counts, truncation and icon resolution stay with the hardware that has them.
 */
export const Dashboard = Capability.makeSingleton<Atom.Atom<SpaceDashboard>>()(
  `${meta.profile.key}.capability.dashboard`,
);

/**
 * The default space as created by identity setup, so first-run seeding can order itself after it.
 *
 * Contributed only by `IdentityCreated`, so it is absent on every boot that does not create an
 * identity, and it holds the space as created rather than the live designation. Anything asking
 * "which space is the default right now" must use `AppSpace.getDefaultSpace`, which reads the
 * designation the user can change in settings.
 */
export const DefaultSpace = Capability.makeSingleton<Space>()(`${meta.profile.key}.capability.defaultSpace`);

export type SettingsSection = { id: string; label: Label; position?: Position.Position };
export const SettingsSection = Capability.makeSingleton<SettingsSection>()(
  `${meta.profile.key}.capability.settingsSection`,
);

export type OnCreateSpace = (params: {
  space: Space;
  isDefault: boolean;
  rootCollection: Collection.Collection;
}) => Effect.Effect<void, Error, Operation.Service>;
export const OnCreateSpace = Capability.make<OnCreateSpace>()(`${meta.profile.key}.capability.onSpaceCreated`);

export type OnTypeAdded = (params: {
  db: Database.Database;
  type: Type.AnyEntity;
  // TODO(wittjosiah): This is leaky.
  show?: boolean;
}) => Effect.Effect<void, Error, Operation.Service>;
export const OnTypeAdded = Capability.make<OnTypeAdded>()(`${meta.profile.key}.capability.onTypeAdded`);

// TODO(wittjosiah): Replace with migrations, this is not a sustainable solution.
export type HandleRepair = (params: { space: Space; isDefault: boolean }) => Promise<void>;
export const Repair = Capability.makeSingleton<HandleRepair>()(`${meta.profile.key}.capability.repair`);

/** Typed creation entry contributed per typename by plugins that support creating objects. */
export type CreateObjectEntry = Readonly<{
  id: string;
  createObject: SpaceSchema.CreateObject;
  /**
   * Effect Schema describing the create form inputs. To use a `Type.Type`
   * entity as the form schema, extract its schema first via `Type.getSchema(...)`.
   */
  inputSchema?: Schema.Codec<any, any>;
  /**
   * Optional custom React panel rendered in place of the default `inputSchema` form.
   * Lets a plugin own the entire post-typename-selection flow (e.g. multi-stage forms).
   * `onCreateObject` receives the collected data and triggers the same submit flow.
   */
  customPanel?: ComponentType<CreateObjectCustomPanelProps>;
}>;
export const CreateObjectEntry = Capability.make<CreateObjectEntry>()(`${meta.profile.key}.capability.createObject`);

/**
 * The identity rule for a type — how to key an object for duplicate detection and how to merge
 * two of them. Plugins that own a type contribute one (e.g. plugin-crm for Person); the type
 * article only offers its Duplicates tab for types that have one.
 */
export const IdentitySpec = Capability.make<import('@dxos/extractor').IdentitySpec<any>>()(
  `${meta.profile.key}.capability.identitySpec`,
);

/** Props passed to a `CreateObjectEntry.customPanel`. */
export type CreateObjectCustomPanelProps = {
  target: Database.Database | Collection.Collection;
  initialFormValues?: Record<string, any>;
  onCreateObject: (data: Record<string, any>) => void | Promise<void>;
};
