//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type AnyIntentChain } from '@dxos/app-framework';
import { type PublicKey } from '@dxos/client';
// TODO(wittjosiah): This pulls in full client.
import { EchoObjectSchema, ReactiveObjectSchema, SpaceSchema } from '@dxos/client/echo';
import { CancellableInvitationObservable, Invitation } from '@dxos/client/invitations';
import { Database, type Obj, QueryAST, Type } from '@dxos/echo';
import { Collection, FieldSchema, View } from '@dxos/schema';
import { type ComplexMap } from '@dxos/util';

import { meta } from '../meta';

import { TypeInputOptionsAnnotation } from './form';

export const SPACE_DIRECTORY_HANDLE = `${meta.id}/directory`;

export const SPACE_TYPE = 'dxos.org/type/Space';

export type SpacePluginOptions = {
  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;

  /**
   * Whether to send observability events.
   */
  observability?: boolean;
};

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

export const SpaceSettingsSchema = Schema.mutable(
  Schema.Struct({
    /**
     * Show closed spaces.
     */
    showHidden: Schema.Boolean,
  }),
);

export type SpaceSettingsProps = Schema.Schema.Type<typeof SpaceSettingsSchema>;

// TODO(wittjosiah): Reconcile with graph export serializers.

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Obj.Any = Obj.Any> {
  serialize(params: { object: T }): Promise<string>;

  /**
   * @param params.content
   * @param params.space Space to use for deserializing schema references.
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; db: Database.Database; newId?: boolean }): Promise<T>;
}

export type CreateObjectIntent = (props: any, options: { db: Database.Database }) => AnyIntentChain;

// TODO(burdon): Move to FormatEnum or SDK.
export const IconAnnotationId = Symbol.for('@dxos/plugin-space/annotation/Icon');
export const HueAnnotationId = Symbol.for('@dxos/plugin-space/annotation/Hue');

// TOOD(burdon): Use SpacePropertiesSchema.
export const SpaceForm = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  icon: Schema.optional(Schema.String.annotations({ title: 'Icon', [IconAnnotationId]: true })),
  hue: Schema.optional(Schema.String.annotations({ title: 'Color', [HueAnnotationId]: true })),
  edgeReplication: Schema.optional(Schema.Boolean.annotations({ title: 'Enable EDGE Replication' })),
});

export const SPACE_ACTION = `${meta.id}/action`;

export namespace SpaceAction {
  export class OpenCreateSpace extends Schema.TaggedClass<OpenCreateSpace>()(`${SPACE_ACTION}/open-create-space`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class Create extends Schema.TaggedClass<Create>()(`${SPACE_ACTION}/create`, {
    input: SpaceForm,
    output: Schema.Struct({
      id: Schema.String,
      subject: Schema.Array(Schema.String),
      space: SpaceSchema,
    }),
  }) {}

  export class Join extends Schema.TaggedClass<Join>()(`${SPACE_ACTION}/join`, {
    input: Schema.Struct({
      invitationCode: Schema.optional(Schema.String),
      onDone: Schema.optional(Schema.Any),
    }),
    output: Schema.Void,
  }) {}

  export class OpenMembers extends Schema.TaggedClass<OpenMembers>()(`${SPACE_ACTION}/open-members`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Share extends Schema.TaggedClass<Share>()(`${SPACE_ACTION}/share`, {
    input: Schema.Struct({
      space: SpaceSchema,
      type: Schema.Enums(Invitation.Type),
      authMethod: Schema.Enums(Invitation.AuthMethod),
      multiUse: Schema.Boolean,
      target: Schema.optional(Schema.String),
    }),
    output: Schema.instanceOf(CancellableInvitationObservable),
  }) {}

  export class GetShareLink extends Schema.TaggedClass<GetShareLink>()(`${SPACE_ACTION}/get-share-link`, {
    input: Schema.Struct({
      space: SpaceSchema,
      target: Schema.optional(Schema.String),
      copyToClipboard: Schema.optional(Schema.Boolean),
    }),
    output: Schema.String,
  }) {}

  export class Lock extends Schema.TaggedClass<Lock>()(`${SPACE_ACTION}/lock`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Unlock extends Schema.TaggedClass<Unlock>()(`${SPACE_ACTION}/unlock`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Rename extends Schema.TaggedClass<Rename>()(`${SPACE_ACTION}/rename`, {
    input: Schema.Struct({
      space: SpaceSchema,
      caller: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  // TODO(wittjosiah): Handle scrolling to section.
  //   This maybe motivates making the space settings its own deck?
  export class OpenSettings extends Schema.TaggedClass<OpenSettings>()(`${SPACE_ACTION}/open-settings`, {
    input: Schema.Struct({ space: SpaceSchema }),
    output: Schema.Void,
  }) {}

  export class Open extends Schema.TaggedClass<Open>()(`${SPACE_ACTION}/open`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Close extends Schema.TaggedClass<Close>()(`${SPACE_ACTION}/close`, {
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Migrate extends Schema.TaggedClass<Migrate>()(`${SPACE_ACTION}/migrate`, {
    input: Schema.Struct({
      space: SpaceSchema,
      version: Schema.optional(Schema.String),
    }),
    output: Schema.Boolean,
  }) {}

  export class Snapshot extends Schema.TaggedClass<Snapshot>()(`${SPACE_ACTION}/snapshot`, {
    input: Schema.Struct({
      db: Database.Database,
      query: QueryAST.Query.pipe(Schema.optional),
    }),
    output: Schema.Struct({
      snapshot: Schema.instanceOf(Blob),
    }),
  }) {}

  export const StoredSchemaForm = Schema.Struct({
    name: Schema.optional(Schema.String),
    typename: Schema.String.pipe(
      Schema.annotations({ title: 'Select type (leave blank to create a new type)' }),
      TypeInputOptionsAnnotation.set({
        location: ['runtime'],
        kind: ['user'],
        registered: ['unregistered'],
      }),
      Schema.optional,
    ),
  });

  export class UseStaticSchema extends Schema.TaggedClass<UseStaticSchema>()(`${SPACE_ACTION}/use-static-schema`, {
    input: Schema.Struct({
      db: Database.Database,
      typename: Schema.String,
      // TODO(wittjosiah): This is leaky.
      show: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({}),
  }) {}

  export class AddSchema extends Schema.TaggedClass<AddSchema>()(`${SPACE_ACTION}/add-schema`, {
    input: Schema.Struct({
      db: Database.Database,
      name: Schema.optional(Schema.String),
      typename: Schema.optional(Schema.String),
      // TODO(wittjosiah): Semantic version format.
      version: Schema.optional(Schema.String),
      // TODO(wittjosiah): Schema for schema?
      schema: Schema.Any,
      // TODO(wittjosiah): This is leaky.
      show: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({
      // TODO(wittjosiah): ObjectId.
      id: Schema.String,
      object: Type.PersistentType,
      schema: Schema.instanceOf(Type.RuntimeType),
    }),
  }) {}

  export class DeleteField extends Schema.TaggedClass<DeleteField>()(`${SPACE_ACTION}/delete-field`, {
    input: Schema.Struct({
      view: View.View,
      fieldId: Schema.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: Schema.optional(
        Schema.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: Schema.Any,
          index: Schema.Number,
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class OpenCreateObject extends Schema.TaggedClass<OpenCreateObject>()(`${SPACE_ACTION}/open-create-object`, {
    input: Schema.Struct({
      target: Schema.Union(Database.Database, Collection.Collection),
      views: Schema.optional(Schema.Boolean),
      typename: Schema.optional(Schema.String),
      initialFormValues: Schema.optional(Schema.Any),
      navigable: Schema.optional(Schema.Boolean),
      // TODO(wittjosiah): This is a function, is there a better way to handle this?
      onCreateObject: Schema.optional(Schema.Any),
    }),
    output: Schema.Void,
  }) {}

  export class AddObject extends Schema.TaggedClass<AddObject>()(`${SPACE_ACTION}/add-object`, {
    input: Schema.Struct({
      object: ReactiveObjectSchema,
      target: Schema.Union(Database.Database, Collection.Collection),
      hidden: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({
      // TODO(wittjosiah): ObjectId.
      id: Schema.String,
      subject: Schema.Array(Schema.String),
      object: EchoObjectSchema,
    }),
  }) {}

  export class AddRelation extends Schema.TaggedClass<AddRelation>()(`${SPACE_ACTION}/add-relation`, {
    input: Schema.Struct({
      db: Database.Database,
      // TODO(wittjosiah): Relation schema.
      schema: Schema.Any,
      source: Type.Expando,
      target: Type.Expando,
      // TODO(wittjosiah): Type based on relation schema.
      fields: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
    }),
    output: Schema.Struct({
      relation: Schema.Any,
    }),
  }) {}

  export const DeletionData = Schema.Struct({
    objects: Schema.Array(EchoObjectSchema),
    parentCollection: Collection.Collection,
    indices: Schema.Array(Schema.Number),
    nestedObjectsList: Schema.Array(Schema.Array(EchoObjectSchema)),
    wasActive: Schema.Array(Schema.String),
  });

  export type DeletionData = Schema.Schema.Type<typeof DeletionData>;

  export class RemoveObjects extends Schema.TaggedClass<RemoveObjects>()(`${SPACE_ACTION}/remove-objects`, {
    input: Schema.Struct({
      // TODO(wittjosiah): Should be Schema.Union(Type.Obj, Type.Relation).
      objects: Schema.Array(ReactiveObjectSchema),
      target: Schema.optional(Collection.Collection),
      deletionData: Schema.optional(DeletionData),
    }),
    output: Schema.Void,
  }) {}

  export class RenameObject extends Schema.TaggedClass<RenameObject>()(`${SPACE_ACTION}/rename-object`, {
    input: Schema.Struct({
      object: EchoObjectSchema,
      caller: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class DuplicateObject extends Schema.TaggedClass<DuplicateObject>()(`${SPACE_ACTION}/duplicate-object`, {
    input: Schema.Struct({
      object: EchoObjectSchema,
      target: Schema.Union(Database.Database, Collection.Collection),
    }),
    output: Schema.Void,
  }) {}

  export class WaitForObject extends Schema.TaggedClass<WaitForObject>()(`${SPACE_ACTION}/wait-for-object`, {
    input: Schema.Struct({
      id: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}
}

export namespace CollectionAction {
  export class Create extends Schema.TaggedClass<Create>()('dxos.org/plugin/collection/action/create', {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Collection.Collection,
    }),
  }) {}
}
