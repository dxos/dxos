//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Channel } from '@dxos/types';

// Lazily loaded (via the #containers barrel) so the react-ui-form dependency
// graph isn't pulled into this capability module's evaluation.
import { ChannelCreatePanel } from '#containers';
import { ChannelBackend, ThreadCapabilities } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Channel.Channel),
      customPanel: ChannelCreatePanel,
      createObject: (
        { name, kind, options }: { name?: string; kind?: string; options?: Record<string, unknown> },
        opts: CreateOptions,
      ) =>
        Effect.gen(function* () {
          const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
          const provider = kind ? ChannelBackend.resolveProvider(providers, kind) : undefined;
          const object = provider
            ? Channel.make({ name, backend: { kind: provider.kind, config: provider.makeConfig(options ?? {}) } })
            : Channel.make({ name });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            { object, target: opts.target },
            { spaceId: opts.db.spaceId },
          );
        }),
    });
  }),
);
