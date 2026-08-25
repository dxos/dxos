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
import { Collection, Database, DXN, Entity, Obj, QueryAST, Ref, Tag, Type, View } from '@dxos/echo';
import { SpacesService } from '@dxos/protocols/rpc';

// `Module` suffix because the client's `SpaceSchema` (the Space entity schema) already holds the
// bare name in this file.
import * as SpaceSchemaModule from './SpaceSchema';

/**
 * Operations for the Space plugin.
 */
export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.create'),
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
    key: DXN.make('org.dxos.operation.space.join'),
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
    key: DXN.make('org.dxos.operation.space.open'),
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
    key: DXN.make('org.dxos.operation.space.close'),
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
    key: DXN.make('org.dxos.operation.space.delete'),
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
    key: DXN.make('org.dxos.operation.space.share'),
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
    key: DXN.make('org.dxos.operation.space.openSettings'),
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
    key: DXN.make('org.dxos.operation.space.waitForObject'),
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
    key: DXN.make('org.dxos.operation.space.addObject'),
    name: 'Add Object',
    description:
      'Creates an object in the space and files it so it appears in Composer. Describe it with ' +
      '`{ "@type": "<typename>", ...properties }`; the type must already be registered ' +
      '(see queryObjects). Omit `target` to file it at the space root.',
    icon: 'ph--plus--regular',
  },
  // Required: the caller names the database — an explicit spaceId, or a database provided in the
  // calling context (the app's create-object dispatch does the latter).
  services: [Database.Service],
  input: Schema.Struct({
    // A union rather than two optional fields, so the schema itself admits exactly one form: a
    // caller that cannot hold a live object — anything across an RPC boundary — describes one, and
    // the handler instantiates it against the space's type registry.
    object: Schema.Union([Obj.Unknown, ObjectDraft]).annotate({
      description: 'The object to add: an instantiated object, or a description of one to create.',
    }),
    // A reference is the only form that survives an RPC boundary, so a remote caller names the
    // target collection that way; in-process callers keep passing the live entity. Absent, the
    // object is filed at the space root of the database the runtime resolved from the space id —
    // a database is never an input, since it cannot cross a process boundary.
    target: Schema.optional(
      Schema.Union([Type.getSchema(Collection.Collection), Ref.Ref(Collection.Collection)]),
    ).annotate({
      description: 'The collection to add to, or a reference to it. Omit to file at the space root.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String,
    object: Obj.Unknown,
  }),
}).pipe(Operation.mutation('write'));

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
    key: DXN.make('org.dxos.operation.space.removeObjects'),
    name: 'Remove Objects',
    description:
      'Deletes entities (objects, relations, or persisted types) from the space and unlinks them ' +
      'from the collection that held them. Name them with `refs` (as returned by queryObjects) ' +
      'when the entities themselves are not held.',
    icon: 'ph--trash--regular',
  },
  // The space comes from the input itself — live entities, or refs that are always space-qualified.
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
}).pipe(Operation.mutation('destructive'));

/**
 * Reclaim the storage held by a space's deleted objects. Permanent — the objects are removed
 * from the space directory and their documents wiped, on this peer and, as the change
 * replicates, on every other.
 */
export const CollectGarbage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.collectGarbage'),
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
    key: DXN.make('org.dxos.operation.space.removeAllObjects'),
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
    key: DXN.make('org.dxos.operation.space.deleteField'),
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

/**
 * Opens a form over a new object and suspends until the user confirms or dismisses it.
 *
 * The two modes differ in when the object exists:
 * - `draft` (default) builds it from the form's values on submit, so nothing is written if the
 *   dialog is dismissed.
 * - `live` adds it to the database before the form opens, so fields that resolve against the
 *   database — dynamic option lookups, autofill, inline refs, child objects — behave exactly as
 *   they do after creation. A dismissal removes it again.
 */
export const OpenObjectForm = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.openObjectForm'),
    name: 'Open Object Form',
    description: 'Open a form over a new object and return it once confirmed.',
    icon: 'ph--plus--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    target: Schema.Union([Database.Database, Type.getSchema(Collection.Collection)]).annotate({
      description: 'The database or collection to create in.',
    }),
    mode: Schema.optional(
      Schema.Literals(['draft', 'live']).annotate({
        description: 'Whether the object is built on submit (`draft`, the default) or up front (`live`).',
      }),
    ),
    views: Schema.optional(Schema.Boolean),
    typename: Schema.optional(Schema.String),
    // An Effect Schema is not itself serializable, so it can only be passed in-process.
    schema: Schema.optional(
      Schema.Any.annotate({
        description:
          "Form schema, overriding the type's own. Typically a projection, e.g. `Type.getSchema(T).pipe(Schema.pick(...))`.",
      }),
    ),
    defaults: Schema.optional(
      Schema.Any.annotate({ description: 'Initial values, seeded into the form (`draft`) or the object (`live`).' }),
    ),
    navigable: Schema.optional(Schema.Boolean),
    targetNodeId: Schema.optional(
      Schema.String.annotate({ description: 'Qualified graph node ID of the target collection.' }),
    ),
  }),
  output: Schema.UndefinedOr(Ref.Ref(Obj.Unknown)).annotate({
    description: 'The created object, or nothing if the dialog was dismissed.',
  }),
});

export const OpenCreateSpace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.openCreate'),
    name: 'Open Create Space Dialog',
    description: 'Open the create space dialog.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});

export const OpenImportSpace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.openImport'),
    name: 'Open Import Space Dialog',
    description: 'Open the import space dialog to create a new space from a backup.',
    icon: 'ph--download--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});

export const ImportSpace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.import'),
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
    key: DXN.make('org.dxos.operation.space.export'),
    name: 'Export Space',
    description: 'Export a space as a backup and download the archive.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
    format: SpacesService.SpaceArchiveFormat,
  }),
  output: Schema.Void,
});

export const Migrate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.migrate'),
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
    key: DXN.make('org.dxos.operation.space.snapshot'),
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
    key: DXN.make('org.dxos.operation.space.rename'),
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
    key: DXN.make('org.dxos.operation.space.renameObject'),
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
    key: DXN.make('org.dxos.operation.space.openMembers'),
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
    key: DXN.make('org.dxos.operation.space.getShareLink'),
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
    key: DXN.make('org.dxos.operation.space.addType'),
    name: 'Add Type',
    description: 'Add a type to the space.',
    icon: 'ph--code--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    // The live schema an in-process caller holds; a remote caller sends the JSON Schema and the
    // handler builds the type from it. Exactly one is required.
    // TODO(wittjosiah): Schema for type?
    type: Schema.optional(Schema.Any),
    // Typed as a record so the tool parameter advertises `type: object`, forcing the model to emit
    // the JSON Schema as an object rather than a JSON-encoded string.
    jsonSchema: Schema.optional(Schema.Record(Schema.String, Schema.Any)).annotate({
      description: 'JSON Schema (draft-07) describing the fields of the new type.',
    }),
    name: Schema.optional(Schema.String).annotate({ description: 'Display name for the type.' }),
    typename: Schema.optional(Schema.String).annotate({
      description: 'Typename in reverse-domain form (e.g. com.example.type.project); required with `jsonSchema`.',
    }),
    version: Schema.optional(Schema.String),
    show: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({
    id: Schema.String,
    object: Type.getSchema(Type.Type),
  }),
}).pipe(Operation.mutation('write'));

/** An object of the relation, live for an in-process caller and a reference for a remote one. */
const RelationEnd = Schema.Union([Obj.Unknown, Ref.Ref(Obj.Unknown)]);

export const AddRelation = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.addRelation'),
    name: 'Add Relation',
    description:
      'Relate two objects. The relation is itself typed, so name a relation type the space knows — ' +
      'query the types to find one.',
    icon: 'ph--link--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    source: RelationEnd,
    target: RelationEnd,
    // The live schema an in-process caller holds; a remote caller names the type instead and the
    // handler resolves it against the space's registry. Exactly one is required.
    // TODO(wittjosiah): Relation schema.
    schema: Schema.optional(Schema.Any),
    typename: Schema.optional(Schema.String).annotate({
      description: 'Typename of the relation to create (e.g. org.dxos.type.hasConnection).',
    }),
    // TODO(wittjosiah): Type based on relation schema.
    fields: Schema.optional(Schema.Record(Schema.String, Schema.Any)).annotate({
      description: "The relation's own properties, matching its type schema.",
    }),
  }),
  output: Schema.Struct({
    relation: Schema.Any,
  }),
}).pipe(Operation.mutation('write'));

// TODO(wittjosiah): This appears to be unused.
export const DuplicateObject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.duplicateObject'),
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
    key: DXN.make('org.dxos.operation.space.restoreField'),
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
    key: DXN.make('org.dxos.operation.space.restoreObjects'),
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
    key: DXN.make('org.dxos.operation.space.findDuplicates'),
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
    key: DXN.make('org.dxos.operation.space.mergeDuplicates'),
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

//
// Object reads and property writes, shaped for remote invocation.
//

const typenameParameter = Schema.String.annotate({
  description: 'ECHO typename (e.g. org.dxos.type.task).',
  example: 'org.dxos.type.task',
});

export const GetObjects = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.getObjects'),
    name: 'Get Objects',
    description:
      'Read objects and relations by reference, returning their content as a point-in-time snapshot. ' +
      'Resolves a reference seen in another object, in the `{ "/": "echo:..." }` envelope form. ' +
      'Batched: pass every reference to read in one call.',
    icon: 'ph--file-magnifying-glass--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    objects: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
  output: Schema.Struct({
    objects: Schema.Array(Schema.Unknown),
  }),
}).pipe(Operation.mutation('none'));

export const UpdateObject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.updateObject'),
    name: 'Update Object',
    description: 'Patch the properties of an object. Supplied field values replace existing ones.',
    icon: 'ph--pencil--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    object: Ref.Ref(Obj.Unknown),
    properties: Schema.Record(Schema.String, Schema.Any).annotate({
      description: 'Field patch, matching the type schema. References use the { "/": "echo:..." } envelope form.',
    }),
  }),
  output: Schema.Struct({
    object: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const QueryObjects = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.queryObjects'),
    name: 'Query Objects',
    description:
      'Query the space for objects by typename and/or full-text search. Omit both to list everything. ' +
      'The typename filter matches every version of the type.',
    icon: 'ph--magnifying-glass--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    in: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))).annotate({
      description:
        'Restrict results to objects reachable from these ones (transitively) — a feed, a collection, ' +
        "a mailbox's feed. Queue-backed content is addressed this way.",
    }),
    typename: Schema.optional(typenameParameter),
    text: Schema.optional(Schema.String).annotate({ description: 'Full-text search terms.' }),
    includeContent: Schema.optional(Schema.Boolean).annotate({
      description: 'Return full object data (default false); false returns id/type/label only.',
    }),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Maximum number of results (default 10).' }),
    includeQueues: Schema.optional(Schema.Boolean).annotate({
      description:
        'Also search the space queues (default false). Queue-backed content — mailbox emails, ' +
        'calendar events — lives behind a feed ref and is invisible without this.',
    }),
  }),
  output: Schema.Struct({
    results: Schema.Array(Schema.Unknown),
  }),
}).pipe(Operation.mutation('none'));

export const AddTag = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.addTag'),
    name: 'Add Tag',
    description: 'Add a tag to an object. Tags are objects, so query for one before creating another.',
    icon: 'ph--tag--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    tag: Ref.Ref(Tag.Tag),
    object: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Struct({
    object: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

export const RemoveTag = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.removeTag'),
    name: 'Remove Tag',
    description: 'Remove a tag from an object.',
    icon: 'ph--tag--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    tag: Ref.Ref(Tag.Tag),
    object: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Struct({
    object: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

/**
 * Distinct from the hosts' `listTypes` tool, which reports the types the host registry carries:
 * this queries the space (and its registry) and returns their schemas.
 */
// TODO(wittjosiah): Can this fold into `QueryObjects` as one general query verb? Types are objects
//  in the registry, so the difference is the scope queried and the shape returned.
export const QueryTypes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.queryTypes'),
    name: 'Query Types',
    description:
      'List the types objects in this space can have — those persisted in the space and those the ' +
      'host itself registers. Returns a summary per type — typename, version, kind, name, ' +
      'description, field names — or, for the typenames named, their full JSON Schema. Read the ' +
      "summary first and ask for a type's schema only when about to create or update one of it.",
    icon: 'ph--list--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    typenames: Schema.optional(Schema.Array(typenameParameter)).annotate({
      description: 'Return the full JSON Schema for these typenames instead of the default summary.',
    }),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Maximum number of types to return.' }),
  }),
  output: Schema.Struct({
    types: Schema.Array(Schema.Unknown),
  }),
}).pipe(Operation.mutation('none'));
