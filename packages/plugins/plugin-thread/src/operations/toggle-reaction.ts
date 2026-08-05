//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { Reaction, ThreadCapabilities, ThreadOperation, findOwnReaction, resolveProvider, senderKey } from '../types';
import { readOnce } from './read-once';

const handler: Operation.WithHandler<typeof ThreadOperation.ToggleReaction> = ThreadOperation.ToggleReaction.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ channel, message, sender, emoji }) {
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, channel.backend.kind);
      invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
      const { subscribeReactions } = provider;
      invariant(subscribeReactions, `Channel backend carries no reactions: ${channel.backend.kind}`);
      invariant(provider.appendReaction, `Channel backend cannot react: ${channel.backend.kind}`);
      invariant(provider.removeReaction, `Channel backend cannot un-react: ${channel.backend.kind}`);

      const reactions = yield* readOnce<Reaction.Reaction>((onItems) => subscribeReactions(channel, onItems));
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

export default handler;
