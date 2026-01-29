//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { type Database } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';
import { type Operation } from '@dxos/operation';
import { type Collection } from '@dxos/schema';
import { type Label } from '@dxos/ui-types';
import { type ComplexMap, type Position } from '@dxos/util';

import { meta } from '../meta';

import { type ObjectViewerProps, type SpaceSettingsProps } from './types';

export namespace SpaceCapabilities {
  export const Settings = Capability.make<Atom.Writable<SpaceSettingsProps>>(`${meta.id}/capability/settings`);

  /** Schema for persisted space plugin state. */
  export const StateSchema = Schema.mutable(
    Schema.Struct({
      spaceNames: Schema.Record({ key: Schema.String, value: Schema.String }),
      enabledEdgeReplication: Schema.Boolean,
    }),
  );

  export type SpaceState = Schema.Schema.Type<typeof StateSchema>;

  /** Persisted state (stored in KVS/localStorage). */
  export const State = Capability.make<Atom.Writable<SpaceState>>(`${meta.id}/capability/state`);

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
    `${meta.id}/capability/ephemeral-state`,
  );

  export type SettingsSection = { id: string; label: Label; position?: Position };
  export const SettingsSection = Capability.make<SettingsSection>(`${meta.id}/capability/settings-section`);

  export type OnCreateSpace = (params: {
    space: Space;
    isDefault: boolean;
    rootCollection: Collection.Collection;
  }) => Effect.Effect<void, Error, Operation.Service>;
  export const OnCreateSpace = Capability.make<OnCreateSpace>(`${meta.id}/capability/on-space-created`);

  export type OnSchemaAdded = (params: {
    db: Database.Database;
    schema: Schema.Schema.AnyNoContext;
    // TODO(wittjosiah): This is leaky.
    show?: boolean;
  }) => Effect.Effect<void, Error, Operation.Service>;
  export const OnSchemaAdded = Capability.make<OnSchemaAdded>(`${meta.id}/capability/on-schema-added`);

  // TODO(wittjosiah): Replace with migrations, this is not a sustainable solution.
  export type HandleRepair = (params: { space: Space; isDefault: boolean }) => Promise<void>;
  export const Repair = Capability.make<HandleRepair>(`${meta.id}/capability/repair`);
}
