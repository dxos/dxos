//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ThreadRoot } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, resolveProvider, targetMessageId } from '../types';
import { readOnce } from './read-once';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateThread> = ThreadOperation.CreateThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message, creator }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      const { subscribeThreadRoots, appendThreadRoot } = provider;
      invariant(appendThreadRoot, `Channel backend cannot create threads: ${channel.backend.kind}`);

      // Any existing declaration already makes the thread exist, whoever wrote it — a second one
      // would only add an item nothing reads.
      const declarations = yield* readOnce<ThreadRoot.ThreadRoot>((onItems) =>
        subscribeThreadRoots ? subscribeThreadRoots(channel, onItems) : () => {},
      );
      if (declarations.some((declaration) => targetMessageId(declaration) === message.id)) {
        return;
      }

      yield* appendThreadRoot(channel, ThreadRoot.make({ target: Ref.make(message), creator }));
    }),
  ),
);

export default handler;
