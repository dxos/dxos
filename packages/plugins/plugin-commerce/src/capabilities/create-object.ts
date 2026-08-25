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

import { Provider, Search } from '#types';

/** Input schema for creating a Search; types the `props` passed to createObject. */
const CreateSearchSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
});

/** Input schema for creating a Provider; types the `props` passed to createObject. */
const CreateProviderSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  url: Schema.optional(Schema.String.annotate({ title: 'URL' })),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Search.Search),
          inputSchema: CreateSearchSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Search.make({ name: props.name ?? 'New search' });
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Provider.Provider),
          inputSchema: CreateProviderSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Provider.make({
                name: props.name ?? 'New provider',
                url: props.url ?? '',
                kind: 'scrape',
              });
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
