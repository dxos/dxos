//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Provider, Search } from '../types';

/** Input schema for creating a Search; types the `props` passed to createObject. */
const CreateSearchSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

/** Input schema for creating a Provider; types the `props` passed to createObject. */
const CreateProviderSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  url: Schema.optional(Schema.String.annotations({ title: 'URL' })),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Search.Search),
        inputSchema: CreateSearchSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Search.make({ name: props.name ?? 'New search' });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Provider.Provider),
        inputSchema: CreateProviderSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Provider.make({
              name: props.name ?? 'New provider',
              url: props.url ?? '',
              kind: 'scrape',
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
