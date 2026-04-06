//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability, Plugin } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client/echo';
import { CancellableInvitationObservable, Invitation } from '@dxos/client/invitations';
import { Collection, Database, Obj, QueryAST, Type, View } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SpaceForm } from '../types';
import { meta } from '#meta';

const COLLECTION_OPERATION = 'org.dxos.plugin.collection.operation';

export namespace CollectionOperation {
  export const Create = Operation.make({
    meta: { key: `${COLLECTION_OPERATION}.create`, name: 'Create Collection' },
    services: [Capability.Service],
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Collection.Collection,
    }),
  });
}

const SPACE_OPERATION = `${meta.id}.operation`;

/**
 * Operations for the Space plugin.
 */
export namespace SpaceOperation {
  export const Create = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.create`,
      name: 'Create Space',
      description: 'Create a new space.',
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
      key: `${SPACE_OPERATION}.join`,
      name: 'Join Space',
      description: 'Join a space via invitation.',
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
      key: `${SPACE_OPERATION}.open`,
      name: 'Open Space',
      description: 'Open a space.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const Close = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.close`,
      name: 'Close Space',
      description: 'Close a space.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const Share = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.share`,
      name: 'Share Space',
      description: 'Share a space.',
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
      key: `${SPACE_OPERATION}.open-settings`,
      name: 'Open Space Settings',
      description: 'Open space settings.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const WaitForObject = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.wait-for-object`,
      name: 'Wait For Object',
      description: 'Wait for an object to be available.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      id: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  });

  export const AddObject = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.add-object`,
      name: 'Add Object',
      description: 'Add an object to a space.',
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
    nestedObjectsList: Schema.Array(Schema.Array(Obj.Unknown)).annotations({
      description: 'Nested objects that were removed.',
    }),
    wasActive: Schema.Array(Schema.String).annotations({
      description: 'IDs of objects that were active before removal.',
    }),
  });

  export type RemoveObjectsOutput = Schema.Schema.Type<typeof RemoveObjectsOutput>;

  export const RemoveObjects = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.remove-objects`,
      name: 'Remove Objects',
      description: 'Remove objects from a space.',
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
      key: `${SPACE_OPERATION}.delete-field`,
      name: 'Delete Field',
      description: 'Delete a field from a view.',
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
      key: `${SPACE_OPERATION}.open-create-object`,
      name: 'Open Create Object Dialog',
      description: 'Open the create object dialog.',
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
      key: `${SPACE_OPERATION}.open-create-space`,
      name: 'Open Create Space Dialog',
      description: 'Open the create space dialog.',
    },
    services: [Capability.Service],
    input: Schema.Void,
    output: Schema.Void,
  });

  export const Migrate = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.migrate`,
      name: 'Migrate Space',
      description: 'Migrate a space to a new version.',
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
      key: `${SPACE_OPERATION}.snapshot`,
      name: 'Create Snapshot',
      description: 'Create a snapshot of the space.',
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
      key: `${SPACE_OPERATION}.rename`,
      name: 'Rename Space',
      description: 'Rename a space.',
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
      key: `${SPACE_OPERATION}.rename-object`,
      name: 'Rename Object',
      description: 'Rename an object.',
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
      key: `${SPACE_OPERATION}.open-members`,
      name: 'Open Members',
      description: 'Open the members panel for a space.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      space: SpaceSchema,
    }),
    output: Schema.Void,
  });

  export const GetShareLink = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.get-share-link`,
      name: 'Get Share Link',
      description: 'Get a shareable link for a space.',
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
      key: `${SPACE_OPERATION}.add-schema`,
      name: 'Add Schema',
      description: 'Add a schema to the space.',
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
      key: `${SPACE_OPERATION}.add-relation`,
      name: 'Add Relation',
      description: 'Add a relation between objects.',
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
      key: `${SPACE_OPERATION}.duplicate-object`,
      name: 'Duplicate Object',
      description: 'Duplicate an object.',
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
      key: `${SPACE_OPERATION}.restore-field`,
      name: 'Restore Field',
      description: 'Restore a deleted field to a view.',
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
   * Restore deleted objects to a space (inverse of RemoveObjects).
   */
  export const RestoreObjects = Operation.make({
    meta: {
      key: `${SPACE_OPERATION}.restore-objects`,
      name: 'Restore Objects',
      description: 'Restore deleted objects to a space.',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      objects: Schema.Array(Obj.Unknown).annotations({ description: 'The objects to restore.' }),
      parentCollection: Collection.Collection.annotations({ description: 'The collection to restore to.' }),
      indices: Schema.Array(Schema.Number).annotations({ description: 'The indices to restore at.' }),
      nestedObjectsList: Schema.Array(Schema.Array(Obj.Unknown)).annotations({
        description: 'Nested objects to restore.',
      }),
      wasActive: Schema.Array(Schema.String).annotations({
        description: 'IDs of objects that were active before deletion.',
      }),
    }),
    output: Schema.Void,
  });
}
