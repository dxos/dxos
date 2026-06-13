//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Channel } from '@dxos/types';

import { meta } from '#meta';

import * as Call from './Call';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Call', icon: 'ph--video-camera--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: Type.getSchema(Channel.Channel),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Call.Call),
  }),
});

export const SetActive = Operation.make({
  meta: {
    key: makeKey('setActive'),
    name: 'Set Active Call',
    icon: 'ph--video-camera--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.optional(Type.getSchema(Call.Call)),
  }),
  output: Schema.Struct({
    object: Schema.optional(Type.getSchema(Call.Call)),
  }),
});

export const HandlePayload = Operation.make({
  meta: {
    key: makeKey('handlePayload'),
    name: 'Handle Call Payload',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    meetingId: Schema.optional(Schema.String),
    transcriptDXN: Schema.optional(Schema.String),
    transcriptionEnabled: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const Summarize = Operation.make({
  meta: {
    key: makeKey('summarize'),
    name: 'Summarize Call',
    icon: 'ph--text-align-left--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    call: Type.getSchema(Call.Call),
  }),
  output: Schema.Void,
});
