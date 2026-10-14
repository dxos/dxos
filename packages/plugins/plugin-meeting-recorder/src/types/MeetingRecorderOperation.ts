//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Meeting from '@dxos/plugin-meeting/Meeting';

export const MicApp = Schema.Struct({
  id: Schema.String.annotate({ description: 'Bundle id of the app, or `pid:<n>`.' }),
  name: Schema.String.annotate({ description: 'Display name of the app.' }),
});

export const Start = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.meetingRecorder.start'),
    name: 'Record Meeting',
    description: 'Create a meeting and start transcribing the microphone (and, on desktop, the other participants).',
    icon: 'ph--record--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String.annotate({ description: 'Name of the new meeting.' })),
    app: Schema.optional(MicApp.annotate({ description: 'The app the meeting is held in, when detected.' })),
    db: Schema.optional(Database.Database.annotate({ description: 'Defaults to the active space.' })),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Meeting.Meeting),
  }),
}).pipe(Operation.visible);

export const Stop = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.meetingRecorder.stop'),
    name: 'Stop Recording Meeting',
    description: 'Stop the current meeting recording and, if enabled, summarize it.',
    icon: 'ph--stop--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({}),
  output: Schema.Void,
}).pipe(Operation.visible);

/**
 * The entry point for detection events: the native listener invokes it for every change in the set
 * of apps using the microphone, and the recorder decides whether that is a meeting.
 */
export const HandleDetection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.meetingRecorder.handleDetection'),
    name: 'Handle Meeting Detection',
    icon: 'ph--microphone--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    type: Schema.Literals(['micStarted', 'micStopped']),
    apps: Schema.Array(MicApp),
  }),
  output: Schema.Void,
});

/** Dismiss a detected meeting without recording it. */
export const ClearDetection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.meetingRecorder.clearDetection'),
    name: 'Dismiss Detected Meeting',
    icon: 'ph--x--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({}),
  output: Schema.Void,
});
