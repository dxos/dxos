//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Ref, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Research } from '#types';

import { LIGHTHOUSE_CONNECTOR_ID } from '../constants.ts';

/** Input schema for creating a Research; types the `props` passed to createObject. */
const CreateResearchSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  run: Schema.optional(
    Schema.String.annotate({
      title: 'Existing session',
      description: 'A lighthouse run id, to open a session started elsewhere (the CLI, the web UI)',
    }),
  ),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Research.Research),
      inputSchema: CreateResearchSchema,
      createObject: (props, options) =>
        Effect.gen(function* () {
          // A space with one lighthouse connection needs no picking: the Research starts on it.
          const connections = yield* Effect.promise(() =>
            options.db.query(Filter.type(Connection.Connection, { connectorId: LIGHTHOUSE_CONNECTOR_ID })).run(),
          );
          const object = Research.make({
            name: props.name ?? 'New research',
            ...(props.run?.trim() ? { run: props.run.trim() } : {}),
            ...(connections[0] ? { connection: Ref.make(connections[0]) } : {}),
          });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            { object, target: options.target },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
