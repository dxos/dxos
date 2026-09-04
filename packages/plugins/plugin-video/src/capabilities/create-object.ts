//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Video } from '#types';

/** Input schema for creating a Video; types the `props` passed to createObject and drives the create form. */
const CreateVideoSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  url: Schema.optional(Schema.String.annotate({ title: 'URL', description: 'The source URL of the video.' })),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Video.Video),
      inputSchema: CreateVideoSchema,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Video.make({ name: props.name, url: props.url });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
