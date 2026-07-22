//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Video } from '#types';

/** Input schema for creating a Video; types the `props` passed to createObject and drives the create form. */
const CreateVideoSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  url: Schema.optional(Schema.String.annotations({ title: 'URL', description: 'The source URL of the video.' })),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Video.Video),
      inputSchema: CreateVideoSchema,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Video.make({ name: props.name, url: props.url });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
