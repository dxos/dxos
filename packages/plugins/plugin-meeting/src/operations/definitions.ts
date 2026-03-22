// Copyright 2025 DXOS.org

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { Channel } from '@dxos/plugin-thread/types';

import { Meeting } from '../types';
import { meta } from '../meta';

const MEETING_OPERATION = `${meta.id}.operation`;

export const Create = Operation.make({
  meta: { key: `${MEETING_OPERATION}.create`, name: 'Create Meeting' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: Channel.Channel,
  }),
  output: Schema.Struct({
    object: Meeting.Meeting,
  }),
});

export const SetActive = Operation.make({
  meta: { key: `${MEETING_OPERATION}.set-active`, name: 'Set Active Meeting' },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.optional(Meeting.Meeting),
  }),
  output: Schema.Struct({
    object: Schema.optional(Meeting.Meeting),
  }),
});

export const HandlePayload = Operation.make({
  meta: { key: `${MEETING_OPERATION}.handle-payload`, name: 'Handle Meeting Payload' },
  services: [Capability.Service],
  input: Schema.Struct({
    meetingId: Schema.optional(Schema.String),
    transcriptDxn: Schema.optional(Schema.String),
    transcriptionEnabled: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const Summarize = Operation.make({
  meta: { key: `${MEETING_OPERATION}.summarize`, name: 'Summarize Meeting' },
  services: [Capability.Service],
  input: Schema.Struct({
    meeting: Meeting.Meeting,
  }),
  output: Schema.Void,
});
