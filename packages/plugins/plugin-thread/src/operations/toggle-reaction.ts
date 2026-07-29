//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type Channel, Reaction } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, findOwnReaction, resolveProvider, senderKey } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.ToggleReaction> = ThreadOperation.ToggleReaction.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message, sender, emoji }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      invariant(provider.appendReaction, `Channel backend cannot react: ${channel.backend.kind}`);
      invariant(provider.removeReaction, `Channel backend cannot un-react: ${channel.backend.kind}`);

      const reactions = yield* readReactions(provider, channel);
      const own = findOwnReaction(reactions, {
        messageId: message.id,
        emoji,
        identityDid: senderKey(sender),
      });

      if (own) {
        yield* provider.removeReaction(channel, own);
        return { reacted: false };
      }

      yield* provider.appendReaction(channel, Reaction.make({ target: Ref.make(message), emoji, sender }));
      return { reacted: true };
    }),
  ),
);

/**
 * Reads the channel's reactions once. The provider exposes only a subscription, whose contract is to
 * deliver the current list immediately, so this takes the first emission and unsubscribes.
 */
const readReactions = (
  provider: ThreadCapabilities.ChannelBackendProvider,
  channel: Channel.Channel,
): Effect.Effect<readonly Reaction.Reaction[]> =>
  Effect.async<readonly Reaction.Reaction[]>((resume) => {
    let done = false;
    // The first emission can arrive before `subscribe` returns, so the handle may not be assigned
    // yet — `done` tells the late assignment to unsubscribe instead.
    let unsubscribe: (() => void) | undefined;
    const handle = provider.subscribeReactions?.(channel, (reactions) => {
      if (done) {
        return;
      }
      done = true;
      unsubscribe?.();
      resume(Effect.succeed(reactions));
    });

    if (done) {
      handle?.();
    } else {
      unsubscribe = handle;
    }

    if (!handle && !done) {
      done = true;
      resume(Effect.succeed([]));
    }

    return Effect.sync(() => {
      done = true;
      unsubscribe?.();
    });
  });

export default handler;
