//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability, Plugin } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client/echo';
import { CancellableInvitationObservable, Invitation } from '@dxos/client/invitations';
import { Operation } from '@dxos/compute';
import { Collection, Database, Obj, QueryAST, Type, View, DXN } from '@dxos/echo';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import { meta } from '#meta';

import { SpaceForm } from '../types';

const COLLECTION_OPERATION = 'org.dxos.plugin.collection.operation';

export namespace CollectionOperation {
  export const Create = Operation.make({
    meta: { key: DXN.make(`${COLLECTION_OPERATION}.create`), name: 'Create Collection', icon: 'ph--folder--regular' },
    services: [Capability.Service],
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Collection.Collection,
    }),
  });
}

const SPACE_OPERATION = `${DXN.getName(meta.id)}.operation`;

/**
 * Operations for the Space plugin.
 */
export namespace SpaceOperation {
  export const Create = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.create`),
      name: 'Create Space',
      description: 'Create a new space.',
      icon: 'ph--plus--regular',
    },
    services: [Capability.Service, Plugin.Service],
    input: SpaceForm,
    output: Schema.Struct({
      id: Schema.String,
      subject: Schema.Array(Schema.String),
      space: SpaceSchema,
    }),
  });

  export const Join = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.join`),
      name: 'Join Space',
      description: 'Join a space via invitation.',
      icon: 'ph--sign-in--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      invitationCode: Schema.optional(Schema.String),
      onDone: Schema.optional(Schema.Any),
    }),
    output: Schema.Void,
  });

  export const Open = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.open`),
      name: 'Open Space',
      description: 'Open a space.',
      icon: 'ph--arrow-square-out--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const Close = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.close`),
      name: 'Close Space',
      description: 'Close a space.',
      icon: 'ph--x-circle--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const Share = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.share`),
      name: 'Share Space',
      description: 'Share a space.',
      icon: 'ph--share-network--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      type: Schema.Enums(Invitation.Type),
      authMethod: Schema.Enums(Invitation.AuthMethod),
      multiUse: Schema.Boolean,
      target: Schema.optional(Schema.String),
    }),
    output: Schema.instanceOf(CancellableInvitationObservable),
  });

  export const OpenSettings = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.openSettings`),
      name: 'Open Space Settings',
      description: 'Open space settings.',
      icon: 'ph--gear--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const WaitForObject = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.waitForObject`),
      name: 'Wait For Object',
      description: 'Wait for an object to be available.',
      icon: 'ph--clock-countdown--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      id: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  });

  export const AddObject = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.addObject`),
      name: 'Add Object',
      description: 'Add an object to a space.',
      icon: 'ph--plus--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      object: Obj.Unknown.annotations({ description: 'The object to add.' }),
      target: Schema.Union(Database.Database, Collection.Collection).annotations({
        description: 'The database or collection to add to.',
      }),
      hidden: Schema.optional(Schema.Boolean),
      targetNodeId: Schema.optional(
        Schema.String.annotations({ description: 'Qualified graph node ID of the target collection.' }),
      ),
    }),
    output: Schema.Struct({
      id: Schema.String,
      subject: Schema.Array(Schema.String),
      object: Obj.Unknown,
    }),
  });

  export const RemoveObjectsOutput = Schema.Struct({
    objects: Schema.Array(Obj.Unknown).annotations({ description: 'The removed objects.' }),
    parentCollection: Collection.Collection.annotations({ description: 'The collection removed from.' }),
    indices: Schema.Array(Schema.Number).annotations({ description: 'The indices the objects were at.' }),
    wasActive: Schema.Array(Schema.String).annotations({
      description: 'IDs of objects that were active before removal.',
    }),
  });

  export type RemoveObjectsOutput = Schema.Schema.Type<typeof RemoveObjectsOutput>;

  export const RemoveObjects = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.removeObjects`),
      name: 'Remove Objects',
      description: 'Remove objects from a space.',
      icon: 'ph--trash--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      objects: Schema.Array(Obj.Unknown).annotations({ description: 'The objects to remove.' }),
      target: Schema.optional(Collection.Collection).annotations({ description: 'The collection to remove from.' }),
    }),
    output: RemoveObjectsOutput,
  });

  export const DeleteFieldOutput = Schema.Struct({
    field: View.FieldSchema.annotations({ description: 'The deleted field schema.' }),
    // TODO(wittjosiah): This creates a type error with PropertySchema.
    props: Schema.Any.annotations({ description: 'The deleted field properties.' }),
    index: Schema.Number.annotations({ description: 'The index the field was at.' }),
  });

  export type DeleteFieldOutput = Schema.Schema.Type<typeof DeleteFieldOutput>;

  export const DeleteField = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.deleteField`),
      name: 'Delete Field',
      description: 'Delete a field from a view.',
      icon: 'ph--minus-circle--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      view: View.View.annotations({ description: 'The view to delete the field from.' }),
      fieldId: Schema.String,
    }),
    output: DeleteFieldOutput,
  });

  export const OpenCreateObject = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.openCreateObject`),
      name: 'Open Create Object Dialog',
      description: 'Open the create object dialog.',
      icon: 'ph--plus--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      target: Schema.Union(Database.Database, Collection.Collection).annotations({
        description: 'The database or collection to create in.',
      }),
      views: Schema.optional(Schema.Boolean),
      typename: Schema.optional(Schema.String),
      initialFormValues: Schema.optional(Schema.Any),
      navigable: Schema.optional(Schema.Boolean),
      targetNodeId: Schema.optional(
        Schema.String.annotations({ description: 'Qualified graph node ID of the target collection.' }),
      ),
      // TODO(wittjosiah): This is a function, is there a better way to handle this?
      onCreateObject: Schema.optional(Schema.Any),
    }),
    output: Schema.Void,
  });

  export const OpenCreateSpace = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.openCreateSpace`),
      name: 'Open Create Space Dialog',
      description: 'Open the create space dialog.',
      icon: 'ph--plus--regular',
    },
    services: [Capability.Service],
    input: Schema.Void,
    output: Schema.Void,
  });

  export const OpenImportSpace = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.openImportSpace`),
      name: 'Open Import Space Dialog',
      description: 'Open the import space dialog to create a new space from a backup.',
      icon: 'ph--download--regular',
    },
    services: [Capability.Service],
    input: Schema.Void,
    output: Schema.Void,
  });

  export const ImportSpace = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.importSpace`),
      name: 'Import Space',
      description: 'Import a space archive as a new space.',
      icon: 'ph--upload--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      archive: Schema.Struct({
        filename: Schema.String,
        contents: Schema.instanceOf(Uint8Array),
      }),
      tags: Schema.Array(Schema.String).pipe(Schema.optional),
    }),
    output: Schema.Struct({
      space: SpaceSchema,
    }),
  });

  export const ExportSpace = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.exportSpace`),
      name: 'Export Space',
      description: 'Export a space as a backup and download the archive.',
      icon: 'ph--download--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      format: Schema.Enums(SpaceArchive.Format),
    }),
    output: Schema.Void,
  });

  export const Migrate = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.migrate`),
      name: 'Migrate Space',
      description: 'Migrate a space to a new version.',
      icon: 'ph--arrows-clockwise--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      version: Schema.optional(Schema.String),
    }),
    output: Schema.Boolean,
  });

  export const Snapshot = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.snapshot`),
      name: 'Create Snapshot',
      description: 'Create a snapshot of the space.',
      icon: 'ph--camera--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      db: Database.Database,
      query: QueryAST.Query.pipe(Schema.optional),
    }),
    output: Schema.Struct({
      snapshot: Schema.instanceOf(Blob),
    }),
  });

  export const Rename = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.rename`),
      name: 'Rename Space',
      description: 'Rename a space.',
      icon: 'ph--pencil-simple--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      caller: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  });

  export const RenameObject = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.renameObject`),
      name: 'Rename Object',
      description: 'Rename an object.',
      icon: 'ph--pencil-simple--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      object: Obj.Unknown,
      caller: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  });

  export const OpenMembers = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.openMembers`),
      name: 'Open Members',
      description: 'Open the members panel for a space.',
      icon: 'ph--users--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const GetShareLink = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.getShareLink`),
      name: 'Get Share Link',
      description: 'Get a shareable link for a space.',
      icon: 'ph--link--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
      target: Schema.optional(Schema.String),
      copyToClipboard: Schema.optional(Schema.Boolean),
    }),
    output: Schema.String,
  });

  export const StoredSchemaForm = Schema.Struct({
    name: Schema.optional(Schema.String),
  });

  export const AddSchema = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.addSchema`),
      name: 'Add Schema',
      description: 'Add a schema to the space.',
      icon: 'ph--code--regular',
    },
    services: [Capability.Service, Plugin.Service],
    input: Schema.Struct({
      db: Database.Database,
      name: Schema.optional(Schema.String),
      typename: Schema.optional(Schema.String),
      version: Schema.optional(Schema.String),
      // TODO(wittjosiah): Schema for schema?
      schema: Schema.Any,
      show: Schema.optional(Schema.Boolean),
    }),
    output: Schema.Struct({
      id: Schema.String,
      object: Type.PersistentType,
      schema: Schema.instanceOf(Type.RuntimeType),
    }),
  });

  export const AddRelation = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.addRelation`),
      name: 'Add Relation',
      description: 'Add a relation between objects.',
      icon: 'ph--link--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      db: Database.Database,
      // TODO(wittjosiah): Relation schema.
      schema: Schema.Any,
      source: Obj.Unknown,
      target: Obj.Unknown,
      // TODO(wittjosiah): Type based on relation schema.
      fields: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
    }),
    output: Schema.Struct({
      relation: Schema.Any,
    }),
  });

  // TODO(wittjosiah): This appears to be unused.
  export const DuplicateObject = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.duplicateObject`),
      name: 'Duplicate Object',
      description: 'Duplicate an object.',
      icon: 'ph--file--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      object: Obj.Unknown,
      target: Schema.Union(Database.Database, Collection.Collection),
    }),
    output: Schema.Void,
  });

  /**
   * Restore a deleted field to a view (inverse of DeleteField).
   */
  export const RestoreField = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.restoreField`),
      name: 'Restore Field',
      description: 'Restore a deleted field to a view.',
      icon: 'ph--clock-counter-clockwise--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      view: View.View.annotations({ description: 'The view to restore the field to.' }),
      field: View.FieldSchema.annotations({ description: 'The field schema to restore.' }),
      // TODO(wittjosiah): This creates a type error with PropertySchema.
      props: Schema.Any.annotations({ description: 'The field properties to restore.' }),
      index: Schema.Number.annotations({ description: 'The index to restore the field at.' }),
    }),
    output: Schema.Void,
  });

  /**
   * Permanently reset a space — deletes ALL objects and truncates feeds via a new epoch.
   * This is unrecoverable.
   */
  export const Reset = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.reset`),
      name: 'Reset Space',
      description: 'Permanently delete all objects and feeds in a space.',
      icon: 'ph--warning--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  /**
   * Restore deleted objects to a space (inverse of RemoveObjects).
   */
  export const RestoreObjects = Operation.make({
    meta: {
      key: DXN.make(`${SPACE_OPERATION}.restoreObjects`),
      name: 'Restore Objects',
      description: 'Restore deleted objects to a space.',
      icon: 'ph--clock-counter-clockwise--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      objects: Schema.Array(Obj.Unknown).annotations({ description: 'The objects to restore.' }),
      parentCollection: Collection.Collection.annotations({ description: 'The collection to restore to.' }),
      indices: Schema.Array(Schema.Number).annotations({ description: 'The indices to restore at.' }),
      wasActive: Schema.Array(Schema.String).annotations({
        description: 'IDs of objects that were active before deletion.',
      }),
    }),
    output: Schema.Void,
  });
}
