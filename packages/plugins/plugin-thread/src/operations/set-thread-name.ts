//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ThreadRoot } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, findOwnDeclaration, resolveProvider, senderKey } from '../types';
import { readOnce } from './read-once';

const handler: Operation.WithHandler<typeof ThreadOperation.SetThreadName> = ThreadOperation.SetThreadName.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message, creator, name }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      const { subscribeThreadRoots, appendThreadRoot } = provider;
      invariant(appendThreadRoot, `Channel backend cannot name threads: ${channel.backend.kind}`);

      // Passed through as `undefined` when the backend has no such subscription: a callback that
      // subscribes to nothing would return an unsubscribe without ever emitting, and `readOnce` would
      // wait for an emission that never comes.
      const declarations = yield* readOnce<ThreadRoot.ThreadRoot>(
        subscribeThreadRoots && ((onItems) => subscribeThreadRoots(channel, onItems)),
      );
      const own = findOwnDeclaration(declarations, { threadId: message.id, identityDid: senderKey(creator) });
      const next = name?.length ? name : undefined;

      // Rewriting the caller's own declaration keeps the write single-writer; re-stamping it is what
      // makes this the newest name, and so the one the fold resolves to.
      if (own) {
        Obj.update(own, (declaration) => {
          declaration.name = next;
          declaration.created = new Date().toISOString();
        });
        return;
      }

      // Naming a thread the caller did not declare adds their own declaration rather than touching
      // anyone else's item.
      yield* appendThreadRoot(channel, ThreadRoot.make({ target: Ref.make(message), creator, name: next }));
    }),
  ),
);

export default handler;
