//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type { ComponentType } from 'react';

import { Capability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { type Operation } from '@dxos/compute';
import { type Collection, type Database, type Type } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';
import { type Label } from '@dxos/ui-types/translations';
import { type ComplexMap, type Position } from '@dxos/util';

import { meta } from '#meta';

import * as Settings from './Settings';
import { type CreateObject, type ObjectViewerProps } from './types';

export namespace SpaceCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.profile.key}.capability.settings`);

  /** Schema for persisted space plugin state. */
  export const StateSchema = Schema.mutable(
    Schema.Struct({
      spaceNames: Schema.Record({ key: Schema.String, value: Schema.String }),
      enabledEdgeReplication: Schema.Boolean,
    }),
  );

  export type SpaceState = Schema.Schema.Type<typeof StateSchema>;

  /** Persisted state (stored in KVS/localStorage). */
  export const State = Capability.make<Atom.Writable<SpaceState>>(`${meta.profile.key}.capability.state`);

  /** Ephemeral space plugin state (not persisted). */
  export type SpaceEphemeralState = {
    awaiting: string | undefined;
    sdkMigrationRunning: Record<string, boolean>;
    navigableCollections: boolean;
    viewersByObject: Record<string, ComplexMap<PublicKey, ObjectViewerProps>>;
    viewersByIdentity: ComplexMap<PublicKey, Set<string>>;
  };

  /** Transient/ephemeral state (not persisted). */
  export const EphemeralState = Capability.make<Atom.Writable<SpaceEphemeralState>>(
    `${meta.profile.key}.capability.ephemeral-state`,
  );

  export type SettingsSection = { id: string; label: Label; position?: Position.Position };
  export const SettingsSection = Capability.make<SettingsSection>(`${meta.profile.key}.capability.settings-section`);

  export type OnCreateSpace = (params: {
    space: Space;
    isDefault: boolean;
    rootCollection: Collection.Collection;
  }) => Effect.Effect<void, Error, Operation.Service>;
  export const OnCreateSpace = Capability.make<OnCreateSpace>(`${meta.profile.key}.capability.on-space-created`);

  export type OnTypeAdded = (params: {
    db: Database.Database;
    type: Type.AnyEntity;
    // TODO(wittjosiah): This is leaky.
    show?: boolean;
  }) => Effect.Effect<void, Error, Operation.Service>;
  export const OnTypeAdded = Capability.make<OnTypeAdded>(`${meta.profile.key}.capability.on-type-added`);

  // TODO(wittjosiah): Replace with migrations, this is not a sustainable solution.
  export type HandleRepair = (params: { space: Space; isDefault: boolean }) => Promise<void>;
  export const Repair = Capability.make<HandleRepair>(`${meta.profile.key}.capability.repair`);

  /** Typed creation entry contributed per typename by plugins that support creating objects. */
  export type CreateObjectEntry = Readonly<{
    id: string;
    createObject: CreateObject;
    /**
     * Effect Schema describing the create form inputs. To use a `Type.Type`
     * entity as the form schema, extract its schema first via `Type.getSchema(...)`.
     */
    inputSchema?: Schema.Schema.AnyNoContext;
    /**
     * Optional custom React panel rendered in place of the default `inputSchema` form.
     * Lets a plugin own the entire post-typename-selection flow (e.g. multi-stage forms).
     * `onCreateObject` receives the collected data and triggers the same submit flow.
     */
    customPanel?: ComponentType<CreateObjectCustomPanelProps>;
  }>;
  export const CreateObjectEntry = Capability.make<CreateObjectEntry>(`${meta.profile.key}.capability.create-object`);

  /** Props passed to a `CreateObjectEntry.customPanel`. */
  export type CreateObjectCustomPanelProps = {
    target: Database.Database | Collection.Collection;
    initialFormValues?: Record<string, any>;
    onCreateObject: (data: Record<string, any>) => void | Promise<void>;
  };
}
