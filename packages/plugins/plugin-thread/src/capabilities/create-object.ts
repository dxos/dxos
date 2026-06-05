//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { lazy } from 'react';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { Channel } from '@dxos/types';

import { ThreadCapabilities, resolveProvider } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

// Lazily loaded so the react-ui-form dependency graph isn't pulled into this
// capability module's evaluation (it's only needed when the panel renders).
const ChannelCreatePanel = lazy(() =>
  import('../components/ChannelCreatePanel').then(({ ChannelCreatePanel }) => ({ default: ChannelCreatePanel })),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Channel.Channel),
      customPanel: ChannelCreatePanel,
      createObject: (
        { name, kind, options }: { name?: string; kind?: string; options?: Record<string, unknown> },
        opts: CreateOptions,
      ) =>
        Effect.gen(function* () {
          const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
          const provider = kind ? resolveProvider(providers, kind) : undefined;
          const object = provider
            ? Channel.make({ name, backend: { kind: provider.kind, config: provider.makeConfig(options ?? {}) } })
            : Channel.make({ name });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: opts.target,
            hidden: true,
            targetNodeId: opts.targetNodeId,
          });
        }),
    });
  }),
);
