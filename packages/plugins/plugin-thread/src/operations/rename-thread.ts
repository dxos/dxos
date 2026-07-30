//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { RENAME_POPOVER } from '@dxos/plugin-space/constants';
import { ThreadRoot } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, foldThreads, resolveProvider } from '../types';
import { readOnce } from './read-once';

const handler: Operation.WithHandler<typeof ThreadOperation.RenameThread> = ThreadOperation.RenameThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message, creator, caller }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      const { subscribeThreadRoots } = provider;

      // Passed through as `undefined` when the backend has no such subscription: a callback that
      // subscribes to nothing would return an unsubscribe without ever emitting, and `readOnce` would
      // wait for an emission that never comes.
      const declarations = yield* readOnce<ThreadRoot.ThreadRoot>(
        subscribeThreadRoots && ((onItems) => subscribeThreadRoots(channel, onItems)),
      );
      const name = foldThreads([], declarations).get(message.id)?.name;

      // The popover commits through a plain callback, so the write goes back through the operation
      // layer via the imperative invoker rather than being performed here.
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: RENAME_POPOVER,
        anchorId: caller ?? '',
        props: {
          initialValue: name ?? '',
          onRename: (next: string) => {
            void invokePromise(ThreadOperation.SetThreadName, { channel, message, creator, name: next });
          },
        },
        kind: 'rename',
      });
    }),
  ),
);

export default handler;
