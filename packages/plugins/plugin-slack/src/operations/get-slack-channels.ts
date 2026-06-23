//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SlackApi } from '../services';
import { SlackOperation } from '../types';

/**
 * Friendly label for a Slack conversation, derived from its type:
 *  - public/private channel: `name` ("#general", "private-stuff").
 *  - IM (`is_im`): the other user's id (we can't resolve to display name
 *    without an extra `users.info` call per conversation; the discovery UI
 *    can do that lazily, or the user accepts the id-prefix label for now).
 *  - mpim (`is_mpim`): Slack's auto-generated comma-joined name in
 *    `name` ("mpdm-alice--bob--carol-1").
 *  - Anything else with a `name`: pass through.
 *
 * Returning a stable, non-empty string here matters because the integration
 * UI uses it as the row label before any local materialization.
 */
const conversationLabel = (conversation: SlackApi.SlackConversation): string => {
  if (conversation.name && conversation.name.length > 0) {
    return conversation.is_channel || conversation.is_group ? `#${conversation.name}` : conversation.name;
  }
  if (conversation.is_im && conversation.user) {
    return `DM with ${conversation.user}`;
  }
  return conversation.id;
};

const conversationKind = (conversation: SlackApi.SlackConversation): string => {
  if (conversation.is_channel) {
    return conversation.is_private ? 'private channel' : 'channel';
  }
  if (conversation.is_group) {
    return 'group';
  }
  if (conversation.is_im) {
    return 'direct message';
  }
  if (conversation.is_mpim) {
    return 'group direct message';
  }
  return 'conversation';
};

/**
 * Discovery only — list Slack conversations reachable from the connection's
 * token and return one descriptor per item. Read-only: NO local Channel objects
 * are created here. Materialization happens via `materializeTarget` when a
 * binding is created.
 */
const handler: Operation.WithHandler<typeof SlackOperation.GetSlackChannels> = SlackOperation.GetSlackChannels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection }) {
      return yield* Effect.gen(function* () {
        const conversations = yield* SlackApi.fetchConversations();
        const targets = conversations.map((conversation) => ({
          id: conversation.id,
          name: conversationLabel(conversation),
          description: conversationKind(conversation),
          metadata: {
            isPrivate: conversation.is_private ?? false,
            isIm: conversation.is_im ?? false,
            isMpim: conversation.is_mpim ?? false,
            isArchived: conversation.is_archived ?? false,
          },
        }));
        return { targets };
      }).pipe(Effect.provide(SlackApi.SlackCredentials.fromConnection(connection)));
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
