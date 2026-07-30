//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { Thread, ThreadCapabilities, ThreadOperation, resolveProvider, targetMessageId } from '../types';
import { readOnce } from './read-once';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateThread> = ThreadOperation.CreateThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      const { subscribeThreads, appendThread } = provider;
      invariant(appendThread, `Channel backend cannot create threads: ${channel.backend.kind}`);

      // One thread per message: a message already threaded keeps the thread it has, whoever created
      // it. Passed through as `undefined` when the backend has no such subscription, since a callback
      // that subscribes to nothing returns an unsubscribe without ever emitting.
      const threads = yield* readOnce<Thread.Thread>(
        subscribeThreads && ((onItems) => subscribeThreads(channel, onItems)),
      );
      const existing = threads.find((thread) => targetMessageId(thread) === message.id);
      if (existing) {
        return { threadId: existing.id };
      }

      const thread = Thread.make({ target: Ref.make(message) });
      yield* appendThread(channel, thread);
      return { threadId: thread.id };
    }),
  ),
);

export default handler;
