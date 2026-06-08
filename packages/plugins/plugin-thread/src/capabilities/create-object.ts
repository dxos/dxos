//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { Channel } from '@dxos/types';

// Lazily loaded (via the #containers barrel) so the react-ui-form dependency
// graph isn't pulled into this capability module's evaluation.
import { ChannelCreatePanel } from '#containers';

import { getChannelsPath } from '../paths';
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
          const db = Database.isDatabase(opts.target) ? opts.target : Obj.getDatabase(opts.target);
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: opts.target,
            hidden: true,
            targetNodeId: opts.targetNodeId ?? (db ? getChannelsPath(db.spaceId) : undefined),
          });
        }),
    });
  }),
);
