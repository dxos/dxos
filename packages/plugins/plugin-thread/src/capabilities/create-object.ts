//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { Channel } from '@dxos/types';

import { ChannelCreatePanel } from '#components';

import { ThreadCapabilities, resolveProvider } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

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
