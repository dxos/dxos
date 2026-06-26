//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Key, Type, DXN } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type; importing it allows TypeScript to name
// it in the emitted .d.ts for AppendChannelMessage.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Channel, type Person } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const CreateChannel = Operation.make({
  meta: { key: makeKey('createChannel'), name: 'Create Channel', icon: 'ph--hash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
    /** Backend provider id; defaults to the local feed backend. */
    kind: Schema.optional(Schema.String),
    /** Per-backend create options passed to the provider's makeConfig. */
    options: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
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
  // Note: Database.Service is provided inside the handler from space.db, not at the
  // operation level — the runtime can't fulfill it without a space context.
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});
