//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
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

export const GetObject = Operation.make({
  meta: {
    key: makeKey('getObject'),
    name: 'Get Object',
    description: 'Read an object by reference and return its content as a point-in-time snapshot.',
    icon: 'ph--file-magnifying-glass--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    object: Ref.Ref(Obj.Unknown),
  }),
  output: Schema.Struct({
    object: Schema.Unknown,
  }),
}).pipe(Operation.mcpTool({ name: 'getObject', safety: 'read', aspect: 'space' }));

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
}).pipe(Operation.mcpTool({ name: 'updateObject', safety: 'write', aspect: 'space' }));

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
}).pipe(Operation.mcpTool({ name: 'queryObjects', safety: 'read', aspect: 'space' }));
