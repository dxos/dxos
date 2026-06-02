//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Filter, Query, Type } from '@dxos/echo';
import { NotificationsCapabilities } from '@dxos/plugin-notification';
import { Message } from '@dxos/types';

import { meta } from '#meta';

const MESSAGE_TYPENAME = Type.getTypename(Message.Message);
const NOT_ASSISTANT = [{ path: 'sender.role', op: 'neq' as const, value: 'assistant' }];

// Channel messages are appended to a feed (server-observable at the feed seam).
const channelMessages: NotificationsCapabilities.RulePreset = {
  id: `${meta.id}/channel-messages`,
  ns: meta.id,
  titleKey: 'notification.channel-messages.label',
  descriptionKey: 'notification.channel-messages.description',
  create: () => ({
    name: 'Channel messages',
    when: { kind: 'feed' },
    match: { typename: MESSAGE_TYPENAME, where: NOT_ASSISTANT },
    notify: { topic: 'channel.message', excludeOwnActions: true },
  }),
};

// Thread comments are ECHO Message objects (matched via a subscription query).
const threadComments: NotificationsCapabilities.RulePreset = {
  id: `${meta.id}/thread-comments`,
  ns: meta.id,
  titleKey: 'notification.thread-comments.label',
  descriptionKey: 'notification.thread-comments.description',
  create: () => ({
    name: 'Thread comments',
    when: { kind: 'subscription', query: { ast: Query.select(Filter.type(Message.Message)).ast } },
    match: { typename: MESSAGE_TYPENAME, where: NOT_ASSISTANT },
    notify: { topic: 'thread.comment', excludeOwnActions: true },
  }),
};

/** Contributes the channel-message and thread-comment notification presets. */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(NotificationsCapabilities.RulePresets, channelMessages),
    Capability.contributes(NotificationsCapabilities.RulePresets, threadComments),
  ]),
);
