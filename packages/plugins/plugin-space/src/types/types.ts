//
// Copyright 2023 DXOS.org
//

import {
  type GraphBuilderProvides,
  type GraphSerializerProvides,
  type IntentResolverProvides,
  type MetadataRecordsProvides,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
  type Plugin,
  ActiveParts,
} from '@dxos/app-framework';
import { AST, S, type AbstractTypedObject, type Expando } from '@dxos/echo-schema';
import { type PanelProvides } from '@dxos/plugin-deck/types';
import { type PublicKey } from '@dxos/react-client';
import { EchoObjectSchema, ReactiveObjectSchema, type Space, SpaceSchema } from '@dxos/react-client/echo';
import { type ComplexMap } from '@dxos/util';

import { CollectionType } from './collection';
import { SPACE_PLUGIN } from '../meta';

export const SPACE_DIRECTORY_HANDLE = 'dxos.org/plugin/space/directory';

export type ObjectViewerProps = {
  lastSeen: number;
  currentlyAttended: boolean;
};

export type ObjectId = string;

export type PluginState = {
  /**
   * Which objects are currently being viewed by which peers.
   */
  viewersByObject: Record<ObjectId, ComplexMap<PublicKey, ObjectViewerProps>>;

  /**
   * Which peers are currently viewing which objects.
   */
  viewersByIdentity: ComplexMap<PublicKey, Set<ObjectId>>;

  /**
   * Object that was linked to directly but not found and is being awaited.
   */
  awaiting: string | undefined;

  /**
   * Cached space names, used when spaces are closed or loading.
   */
  spaceNames: Record<string, string>;

  /**
   * Which spaces have an SDK migration running currently.
   */
  // TODO(wittjosiah): Factor out to sdk. Migration running should probably be a space state.
  sdkMigrationRunning: Record<string, boolean>;

  /**
   * Whether or not the user can navigate to collections in the graph.
   * Determined by whether or not there is an available plugin that can render a collection.
   */
  navigableCollections: boolean;

  /**
   * Tracks whether setting edge replication as default has been run on spaces.
   */
  // TODO(wittjosiah): Systematic way to handle migrations of state outside of spaces.
  enabledEdgeReplication: boolean;
};

export type SpaceSettingsProps = {
  /**
   * Show closed spaces.
   */
  showHidden?: boolean;
};

export type SchemaProvides = {
  echo: {
    schema?: AbstractTypedObject[];
    system?: AbstractTypedObject[];
  };
};

export const parseSchemaPlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).echo?.schema) || Array.isArray((plugin?.provides as any).echo?.system)
    ? (plugin as Plugin<SchemaProvides>)
    : undefined;

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  SettingsProvides<SpaceSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  PanelProvides & {
    space: Readonly<PluginState>;
  };

// TODO(wittjosiah): Reconcile with graph export serializers.

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Expando = Expando> {
  serialize(params: { object: T }): Promise<string>;

  /**
   * @param params.content
   * @param params.space Space to use for deserializing schema references.
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; space: Space; newId?: boolean }): Promise<T>;
}

export const SpaceForm = S.Struct({
  name: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Name' })),
  // TODO(wittjosiah): Make optional with default value.
  edgeReplication: S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Enable EDGE Replication' }),
});

export const SPACE_ACTION = `${SPACE_PLUGIN}/action`;

export namespace SpaceAction {
  export class OpenCreateSpace extends S.TaggedClass<OpenCreateSpace>()(`${SPACE_ACTION}/open-create-space`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class Create extends S.TaggedClass<Create>()(`${SPACE_ACTION}/create`, {
    input: SpaceForm,
    output: S.Struct({
      id: S.String,
      activeParts: ActiveParts,
      space: SpaceSchema,
    }),
  }) {}

  export class Join extends S.TaggedClass<Join>()(`${SPACE_ACTION}/join`, {
    input: S.Struct({
      invitationCode: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class Share extends S.TaggedClass<Share>()(`${SPACE_ACTION}/share`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Lock extends S.TaggedClass<Lock>()(`${SPACE_ACTION}/lock`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Unlock extends S.TaggedClass<Unlock>()(`${SPACE_ACTION}/unlock`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Rename extends S.TaggedClass<Rename>()(`${SPACE_ACTION}/rename`, {
    input: S.Struct({
      space: SpaceSchema,
      caller: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class OpenSettings extends S.TaggedClass<OpenSettings>()(`${SPACE_ACTION}/open-settings`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Open extends S.TaggedClass<Open>()(`${SPACE_ACTION}/open`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Close extends S.TaggedClass<Close>()(`${SPACE_ACTION}/close`, {
    input: S.Struct({
      space: SpaceSchema,
    }),
    output: S.Void,
  }) {}

  export class Migrate extends S.TaggedClass<Migrate>()(`${SPACE_ACTION}/migrate`, {
    input: S.Struct({
      space: SpaceSchema,
      version: S.optional(S.String),
    }),
    output: S.Boolean,
  }) {}

  export class OpenCreateObject extends S.TaggedClass<OpenCreateObject>()(`${SPACE_ACTION}/open-create-object`, {
    input: S.Struct({
      target: S.Union(SpaceSchema, CollectionType),
    }),
    output: S.Void,
  }) {}

  export class AddObject extends S.TaggedClass<AddObject>()(`${SPACE_ACTION}/add-object`, {
    input: S.Struct({
      object: ReactiveObjectSchema,
      target: S.Union(SpaceSchema, CollectionType),
    }),
    output: S.Struct({
      id: S.String,
      activeParts: ActiveParts,
      object: EchoObjectSchema,
    }),
  }) {}

  export const DeletionData = S.Struct({
    objects: S.Array(EchoObjectSchema),
    parentCollection: CollectionType,
    indices: S.Array(S.Number),
    nestedObjectsList: S.Array(S.Array(EchoObjectSchema)),
    wasActive: S.Array(S.String),
  });

  export type DeletionData = S.Schema.Type<typeof DeletionData>;

  export class RemoveObjects extends S.TaggedClass<RemoveObjects>()(`${SPACE_ACTION}/remove-objects`, {
    input: S.Struct({
      objects: S.Array(EchoObjectSchema),
      target: S.optional(CollectionType),
      deletionData: S.optional(DeletionData),
    }),
    output: S.Void,
  }) {}

  export class RenameObject extends S.TaggedClass<RenameObject>()(`${SPACE_ACTION}/rename-object`, {
    input: S.Struct({
      object: EchoObjectSchema,
      caller: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class DuplicateObject extends S.TaggedClass<DuplicateObject>()(`${SPACE_ACTION}/duplicate-object`, {
    input: S.Struct({
      object: EchoObjectSchema,
      target: S.Union(SpaceSchema, CollectionType),
    }),
    output: S.Void,
  }) {}

  export class WaitForObject extends S.TaggedClass<WaitForObject>()(`${SPACE_ACTION}/wait-for-object`, {
    input: S.Struct({
      id: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class ToggleHidden extends S.TaggedClass<ToggleHidden>()(`${SPACE_ACTION}/toggle-hidden`, {
    input: S.Struct({
      state: S.optional(S.Boolean),
    }),
    output: S.Void,
  }) {}
}

export namespace CollectionAction {
  export class Create extends S.TaggedClass<Create>()('dxos.org/plugin/collection/action/create', {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CollectionType,
    }),
  }) {}
}
