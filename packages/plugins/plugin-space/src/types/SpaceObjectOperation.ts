//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Tag } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/**
 * Generic object reads and property writes, shaped for remote invocation.
 *
 * Deliberately a leaf module: it imports only compute/echo/keys, so a headless host (the edge
 * operation-service, `dx mcp serve`) loads these definitions without the app-only graph that
 * `SpaceOperation` pulls in (`@dxos/client`, `@dxos/app-framework/Capability`, invitations).
 *
 * The mutating half of the surface lives in `SpaceOperation`: `addObject` files an object into the
 * space and `removeObjects` takes it out, both mirroring `Database.add` / `Database.remove`.
 */

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

const typenameParameter = Schema.String.annotate({
  description: 'ECHO typename (e.g. org.dxos.type.task).',
  example: 'org.dxos.type.task',
});

export const GetObjects = Operation.make({
  meta: {
    key: makeKey('getObjects'),
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
    key: makeKey('updateObject'),
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
    key: makeKey('queryObjects'),
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
    key: makeKey('addTag'),
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
    key: makeKey('removeTag'),
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
export const QueryTypes = Operation.make({
  meta: {
    key: makeKey('queryTypes'),
    name: 'Query Types',
    description:
      'List the types registered in the space. Returns a summary per type — typename, kind, name, ' +
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
