//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Key, Type, DXN } from '@dxos/echo';
import { Actor, Channel } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

export const OnCreateSpace = Operation.make({
  meta: { key: makeKey('onCreateSpace'), name: 'On Create Space', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Type.getSchema(Collection.Collection),
    isDefault: Schema.Boolean.pipe(Schema.optional),
  }),
  output: Schema.Void,
});

export const CreateChannel = Operation.make({
  meta: { key: makeKey('createChannel'), name: 'Create Channel', icon: 'ph--hash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Channel.Channel),
  }),
});

export const AppendChannelMessage = Operation.make({
  meta: {
    key: makeKey('appendChannelMessage'),
    name: 'Append Channel Message',
    icon: 'ph--chat-text--regular',
  },
  // Note: Feed.FeedService is provided inside the handler from space.queues, not at the
  // operation level — the runtime can't fulfill it without a space context.
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});
