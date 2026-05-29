//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { meta } from '#meta';

import * as Meeting from './Meeting';

const MEETING_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${MEETING_OPERATION}.create`, name: 'Create Meeting', icon: 'ph--video-camera--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: Type.getSchema(Channel.Channel),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Meeting.Meeting),
  }),
});

export const SetActive = Operation.make({
  meta: { key: `${MEETING_OPERATION}.set-active`, name: 'Set Active Meeting', icon: 'ph--video-camera--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.optional(Type.getSchema(Meeting.Meeting)),
  }),
  output: Schema.Struct({
    object: Schema.optional(Type.getSchema(Meeting.Meeting)),
  }),
});

export const HandlePayload = Operation.make({
  meta: {
    key: `${MEETING_OPERATION}.handle-payload`,
    name: 'Handle Meeting Payload',
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
  meta: { key: `${MEETING_OPERATION}.summarize`, name: 'Summarize Meeting', icon: 'ph--text-align-left--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    meeting: Type.getSchema(Meeting.Meeting),
  }),
  output: Schema.Void,
});
