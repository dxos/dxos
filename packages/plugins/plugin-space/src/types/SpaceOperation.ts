//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { SpaceSchema } from '@dxos/client/echo';
import { CancellableInvitationObservable, Invitation } from '@dxos/client/invitations';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Database, DXN, Entity, Obj, QueryAST, Ref, Type, View } from '@dxos/echo';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import { meta } from '#meta';

// `Module` suffix because the client's `SpaceSchema` (the Space entity schema) already holds the
// bare name in this file.
import * as SpaceSchemaModule from './SpaceSchema';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Operations for the Space plugin.
 */
export const Create = Operation.make({
  meta: {
    key: makeKey('create'),
    name: 'Create Space',
    description: 'Create a new space.',
    icon: 'ph--plus--regular',
  },
  services: [Capability.Service, Plugin.Service],
  input: SpaceSchemaModule.SpaceForm,
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    space: SpaceSchema,
  }),
});

export const Join = Operation.make({
  meta: {
    key: makeKey('join'),
    name: 'Join Space',
    description: 'Join a space via invitation.',
    icon: 'ph--sign-in--regular',
  },
  // `HaloServicesLayer`, which the handler provides to read the local identity, requires it.
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
    onDone: Schema.optional(Schema.Any),
  }),
  output: Schema.Void,
});

export const Open = Operation.make({
  meta: {
    key: makeKey('open'),
    name: 'Open Space',
    description: 'Open a space.',
    icon: 'ph--arrow-square-out--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

export const Close = Operation.make({
  meta: {
    key: makeKey('close'),
    name: 'Close Space',
    description: 'Close a space.',
    icon: 'ph--x-circle--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

export const Delete = Operation.make({
  meta: {
    key: makeKey('delete'),
    name: 'Delete Space',
    description: 'Delete a space. The deletion replicates to all of your devices.',
    icon: 'ph--trash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

export const Share = Operation.make({
  meta: {
    key: makeKey('share'),
    name: 'Share Space',
    description: 'Share a space.',
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
    type: Schema.Enum(Invitation.Type),
    authMethod: Schema.Enum(Invitation.AuthMethod),
    multiUse: Schema.Boolean,
    target: Schema.optional(Schema.String),
  }),
  output: Schema.instanceOf(CancellableInvitationObservable),
});

export const OpenSettings = Operation.make({
  meta: {
    key: makeKey('openSettings'),
    name: 'Open Space Settings',
    description: 'Open space settings.',
    icon: 'ph--gear--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

export const WaitForObject = Operation.make({
  meta: {
    key: makeKey('waitForObject'),
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

/**
 * An object described rather than held: the typename plus its properties, which is all a caller
 * outside this process can supply. References are the `{ "/": "echo:..." }` envelope form.
 */
export const ObjectDraft = Schema.StructWithRest(
  Schema.Struct({
    '@type': Schema.String.annotate({
      description: 'Typename of the object to create (e.g. org.dxos.type.task).',
      examples: ['org.dxos.type.task'],
    }),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);
export type ObjectDraft = Schema.Schema.Type<typeof ObjectDraft>;

export const AddObject = Operation.make({
  meta: {
    key: makeKey('addObject'),
    name: 'Add Object',
    description: 'Add an object to a space.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    object: Schema.optional(Obj.Unknown).annotate({ description: 'The object to add, already instantiated.' }),
    // A caller that cannot hold a live object — anything across an RPC boundary — describes one
    // instead, and the handler instantiates it against the space's type registry. Kept as its own
    // field rather than a union with `object`, so the live path's schema (and its decoding) is
    // untouched. Exactly one of the two is required.
    create: Schema.optional(ObjectDraft).annotate({
      description: 'Description of an object to create and add, when no instantiated object is available.',
    }),
    // A reference is the only form of the three that survives an RPC boundary, so a remote caller
    // names the target collection that way; in-process callers keep passing the live entity.
    // Absent, the object is filed at the space root.
    target: Schema.optional(
      Schema.Union([Database.Database, Type.getSchema(Collection.Collection), Ref.Ref(Collection.Collection)]),
    ).annotate({
      description: 'The database or collection to add to, or a reference to the collection.',
    }),
    targetNodeId: Schema.optional(
      Schema.String.annotate({ description: 'Qualified graph node ID of the target collection.' }),
    ),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    object: Obj.Unknown,
  }),
}).pipe(
  Operation.mcpTool({
    name: 'addObject',
    description:
      'Creates an object in the space and files it so it appears in Composer. Describe it with ' +
      '`create` ({ "@type": "<typename>", ...properties }); the type must already be registered ' +
      '(see queryObjects). Reference values use the envelope form { "/": "echo:..." }. Omit ' +
      '`target` to file it at the space root.',
    safety: 'write',
    aspect: 'space',
  }),
);

// TODO(wittjosiah): Rename `objects` to `entities` (covers objects, relations, and persisted types).
export const RemoveObjectsOutput = Schema.Struct({
  objects: Schema.Array(Entity.Unknown).annotate({ description: 'The removed entities.' }),
  parentCollection: Type.getSchema(Collection.Collection).annotate({
    description: 'The collection removed from.',
  }),
  indices: Schema.Array(Schema.Number).annotate({ description: 'The indices the objects were at.' }),
  wasActive: Schema.Array(Schema.String).annotate({
    description: 'IDs of objects that were active before removal.',
  }),
});

export type RemoveObjectsOutput = Schema.Schema.Type<typeof RemoveObjectsOutput>;

export const RemoveObjects = Operation.make({
  meta: {
    key: makeKey('removeObjects'),
    name: 'Remove Objects',
    description: 'Remove entities (objects, relations, or persisted types) from a space.',
    icon: 'ph--trash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    objects: Schema.optional(Schema.Array(Entity.Unknown)).annotate({ description: 'The entities to remove.' }),
    // References are what a caller outside this process can supply; resolved to the same entities
    // before anything else happens. Exactly one of the two is required.
    refs: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))).annotate({
      description: 'References to the entities to remove, when the entities themselves are not held.',
    }),
    target: Schema.optional(Type.getSchema(Collection.Collection)).annotate({
      description: 'The collection to remove from.',
    }),
  }),
  output: RemoveObjectsOutput,
}).pipe(
  Operation.mcpTool({
    name: 'removeObjects',
    description:
      'Deletes entities from the space and unlinks them from the collection that held them. Name ' +
      'them with `refs` (an array of { "/": "echo:..." } envelopes, as returned by queryObjects).',
    safety: 'destructive',
    aspect: 'space',
  }),
);

/**
 * Reclaim the storage held by a space's deleted objects. Permanent — the objects are removed
 * from the space directory and their documents wiped, on this peer and, as the change
 * replicates, on every other.
 */
export const CollectGarbage = Operation.make({
  meta: {
    key: makeKey('collectGarbage'),
    name: 'Collect Garbage',
    description: "Permanently reclaim the storage held by a space's deleted objects.",
    icon: 'ph--recycle--regular',
  },
  services: [Database.Service],
  input: Schema.Void,
  output: Schema.Struct({
    unlinkedObjects: Schema.Number.annotate({ description: 'Deleted objects removed from the space.' }),
    removedDocuments: Schema.Number.annotate({ description: 'Documents wiped from storage.' }),
  }),
});

/**
 * Remove every object from a space except its `SpaceProperties`. The root collection is kept —
 * `RootCollectionAnnotation` must keep resolving for the space to stay navigable — but emptied.
 *
 * The cleared objects are reclaimed rather than left as tombstones, so unlike
 * {@link RemoveObjects} this is permanent and deliberately has no undo mapping.
 */
export const RemoveAllObjects = Operation.make({
  meta: {
    key: makeKey('removeAllObjects'),
    name: 'Remove All Objects',
    description: 'Permanently remove all objects from a space, preserving the space properties.',
    icon: 'ph--trash--regular',
  },
  services: [Database.Service],
  input: Schema.Void,
  output: Schema.Struct({
    objectIds: Schema.Array(Schema.String).annotate({ description: 'IDs of the removed objects.' }),
  }),
});

export const DeleteFieldOutput = Schema.Struct({
  field: View.FieldSchema.annotate({ description: 'The deleted field schema.' }),
  // TODO(wittjosiah): This creates a type error with PropertySchema.
  props: Schema.Any.annotate({ description: 'The deleted field properties.' }),
  index: Schema.Number.annotate({ description: 'The index the field was at.' }),
});

export type DeleteFieldOutput = Schema.Schema.Type<typeof DeleteFieldOutput>;

export const DeleteField = Operation.make({
  meta: {
    key: makeKey('deleteField'),
    name: 'Delete Field',
    description: 'Delete a field from a view.',
    icon: 'ph--minus-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View).annotate({ description: 'The view to delete the field from.' }),
    fieldId: Schema.String,
  }),
  output: DeleteFieldOutput,
});

export const OpenCreateObject = Operation.make({
  meta: {
    key: makeKey('openCreateObject'),
    name: 'Open Create Object Dialog',
    description: 'Open the create object dialog.',
    icon: 'ph--plus--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    target: Schema.Union([Database.Database, Type.getSchema(Collection.Collection)]).annotate({
      description: 'The database or collection to create in.',
    }),
    views: Schema.optional(Schema.Boolean),
    typename: Schema.optional(Schema.String),
    initialFormValues: Schema.optional(Schema.Any),
    navigable: Schema.optional(Schema.Boolean),
    targetNodeId: Schema.optional(
      Schema.String.annotate({ description: 'Qualified graph node ID of the target collection.' }),
    ),
    // TODO(wittjosiah): This is a function, is there a better way to handle this?
    onCreateObject: Schema.optional(Schema.Any),
  }),
  output: Schema.Void,
});

export const OpenCreateSpace = Operation.make({
  meta: {
    key: makeKey('openCreateSpace'),
    name: 'Open Create Space Dialog',
    description: 'Open the create space dialog.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});

export const OpenImportSpace = Operation.make({
  meta: {
    key: makeKey('openImportSpace'),
    name: 'Open Import Space Dialog',
    description: 'Open the import space dialog to create a new space from a backup.',
    icon: 'ph--download--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});

export const ImportSpace = Operation.make({
  meta: {
    key: makeKey('importSpace'),
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
    key: makeKey('exportSpace'),
    name: 'Export Space',
    description: 'Export a space as a backup and download the archive.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
    format: Schema.Enum(SpaceArchive.Format),
  }),
  output: Schema.Void,
});

export const Migrate = Operation.make({
  meta: {
    key: makeKey('migrate'),
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
    key: makeKey('snapshot'),
    name: 'Create Snapshot',
    description: 'Create a snapshot of the space.',
    icon: 'ph--camera--regular',
  },
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
    key: makeKey('rename'),
    name: 'Rename Space',
    description: 'Rename a space.',
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
    caller: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const RenameObject = Operation.make({
  meta: {
    key: makeKey('renameObject'),
    name: 'Rename Object',
    description: 'Rename an entity (object, relation, or persisted type).',
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    object: Entity.Unknown,
    caller: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const OpenMembers = Operation.make({
  meta: {
    key: makeKey('openMembers'),
    name: 'Open Members',
    description: 'Open the members panel for a space.',
    icon: 'ph--users--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

export const GetShareLink = Operation.make({
  meta: {
    key: makeKey('getShareLink'),
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

export const AddType = Operation.make({
  meta: {
    key: makeKey('addType'),
    name: 'Add Type',
    description: 'Add a type to the space.',
    icon: 'ph--code--regular',
  },
  services: [Capability.Service, Plugin.Service],
  input: Schema.Struct({
    db: Database.Database,
    name: Schema.optional(Schema.String),
    typename: Schema.optional(Schema.String),
    version: Schema.optional(Schema.String),
    // TODO(wittjosiah): Schema for type?
    type: Schema.Any,
    show: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    id: Schema.String,
    object: Type.getSchema(Type.Type),
  }),
});

export const AddRelation = Operation.make({
  meta: {
    key: makeKey('addRelation'),
    name: 'Add Relation',
    description: 'Add a relation between objects.',
    icon: 'ph--link--regular',
  },
  input: Schema.Struct({
    db: Database.Database,
    // TODO(wittjosiah): Relation schema.
    schema: Schema.Any,
    source: Obj.Unknown,
    target: Obj.Unknown,
    // TODO(wittjosiah): Type based on relation schema.
    fields: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  }),
  output: Schema.Struct({
    relation: Schema.Any,
  }),
});

// TODO(wittjosiah): This appears to be unused.
export const DuplicateObject = Operation.make({
  meta: {
    key: makeKey('duplicateObject'),
    name: 'Duplicate Object',
    description: 'Duplicate an object.',
    icon: 'ph--file--regular',
  },
  input: Schema.Struct({
    object: Obj.Unknown,
    target: Schema.Union([Database.Database, Type.getSchema(Collection.Collection)]),
  }),
  output: Schema.Void,
});

/**
 * Restore a deleted field to a view (inverse of DeleteField).
 */
export const RestoreField = Operation.make({
  meta: {
    key: makeKey('restoreField'),
    name: 'Restore Field',
    description: 'Restore a deleted field to a view.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    view: Type.getSchema(View.View).annotate({ description: 'The view to restore the field to.' }),
    field: View.FieldSchema.annotate({ description: 'The field schema to restore.' }),
    // TODO(wittjosiah): This creates a type error with PropertySchema.
    props: Schema.Any.annotate({ description: 'The field properties to restore.' }),
    index: Schema.Number.annotate({ description: 'The index to restore the field at.' }),
  }),
  output: Schema.Void,
});

/**
 * Restore deleted entities to a space (inverse of RemoveObjects).
 */
export const RestoreObjects = Operation.make({
  meta: {
    key: makeKey('restoreObjects'),
    name: 'Restore Objects',
    description: 'Restore deleted entities to a space.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    objects: Schema.Array(Entity.Unknown).annotate({ description: 'The entities to restore.' }),
    parentCollection: Type.getSchema(Collection.Collection).annotate({
      description: 'The collection to restore to.',
    }),
    indices: Schema.Array(Schema.Number).annotate({ description: 'The indices to restore at.' }),
    wasActive: Schema.Array(Schema.String).annotate({
      description: 'IDs of objects that were active before deletion.',
    }),
  }),
  output: Schema.Void,
});

/** A duplicate tuple, addressed by id so the group crosses the operation boundary. */
export const DuplicateGroupResult = Schema.Struct({
  keys: Schema.Array(Schema.String).annotate({ description: 'Identity keys shared by the members.' }),
  objectIds: Schema.Array(Schema.String).annotate({ description: 'Members, in EntityId order.' }),
});

export type DuplicateGroupResult = Schema.Schema.Type<typeof DuplicateGroupResult>;

/**
 * Groups objects of a type that share an identity key. The rule is the `IdentitySpec` the owning
 * plugin contributes for that typename — the same rule the extractor uses to decide create vs
 * merge, so a scan never disagrees with what extraction would have done.
 */
export const FindDuplicates = Operation.make({
  meta: {
    key: makeKey('findDuplicates'),
    name: 'Find Duplicates',
    description: 'Group objects of a type that share an identity key (e.g. an email address).',
    icon: 'ph--copy--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    typename: Schema.String.annotate({ description: 'ECHO typename to scan.' }),
  }),
  output: Schema.Struct({
    groups: Schema.Array(DuplicateGroupResult).annotate({ description: 'Largest group first.' }),
  }),
});

/** Merges a duplicate group into its lowest-EntityId member and removes the others. */
export const MergeDuplicates = Operation.make({
  meta: {
    key: makeKey('mergeDuplicates'),
    name: 'Merge Duplicates',
    description: 'Merge a duplicate group into a single object.',
    icon: 'ph--arrows-merge--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    typename: Schema.String,
    objectIds: Schema.Array(Schema.String).annotate({ description: 'Members of the group to merge.' }),
    overrides: Schema.optional(Obj.Unknown).annotate({
      description: 'User-edited preview; folded in last so confirmed edits win.',
    }),
  }),
  output: Schema.Struct({
    survivorId: Schema.String,
    removedIds: Schema.Array(Schema.String),
  }),
});
