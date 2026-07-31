//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Channel, Event } from '@dxos/types';

import { meta } from '#meta';

import * as Meeting from './Meeting';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Meeting', icon: 'ph--video-camera--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    channel: Schema.optional(Type.getSchema(Channel.Channel)),
    /** Anchor the new meeting to this event (creates a `Meeting --AnchoredTo--> Event` relation). */
    event: Schema.optional(Ref.Ref(Event.Event)),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Meeting.Meeting),
  }),
});

export const SetActive = Operation.make({
  meta: {
    key: makeKey('setActive'),
    name: 'Set Active Meeting',
    icon: 'ph--video-camera--regular',
  },
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
    key: makeKey('handlePayload'),
    name: 'Handle Meeting Payload',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    meetingId: Schema.optional(Schema.String),
    // Matches the protobuf wire field `transcript_dxn` (MeetingPayload), carried verbatim from the call activity.
    transcriptDxn: Schema.optional(Schema.String),
    transcriptionEnabled: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const Summarize = Operation.make({
  meta: {
    key: makeKey('summarize'),
    name: 'Summarize Meeting',
    icon: 'ph--text-align-left--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    meeting: Type.getSchema(Meeting.Meeting),
  }),
  output: Schema.Void,
}).pipe(Operation.visible);
