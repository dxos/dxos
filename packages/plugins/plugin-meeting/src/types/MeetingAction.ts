//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import { Operation } from '@dxos/operation';
import { Channel } from '@dxos/plugin-thread/types';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import { Meeting } from './Meeting';

const MEETING_OPERATION = `${meta.id}/operation`;

export namespace MeetingOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${MEETING_OPERATION}/on-create-space`, name: 'On Create Space' },
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const Create = Operation.make({
    meta: { key: `${MEETING_OPERATION}/create`, name: 'Create Meeting' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        channel: Channel.Channel,
      }),
      output: Schema.Struct({
        object: Meeting,
      }),
    },
  });

  export const SetActive = Operation.make({
    meta: { key: `${MEETING_OPERATION}/set-active`, name: 'Set Active Meeting' },
    schema: {
      input: Schema.Struct({
        object: Schema.optional(Meeting),
      }),
      output: Schema.Struct({
        object: Schema.optional(Meeting),
      }),
    },
  });

  export const HandlePayload = Operation.make({
    meta: { key: `${MEETING_OPERATION}/handle-payload`, name: 'Handle Meeting Payload' },
    schema: {
      input: Schema.Struct({
        meetingId: Schema.optional(Schema.String),
        transcriptDxn: Schema.optional(Schema.String),
        transcriptionEnabled: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const Summarize = Operation.make({
    meta: { key: `${MEETING_OPERATION}/summarize`, name: 'Summarize Meeting' },
    schema: {
      input: Schema.Struct({
        meeting: Meeting,
      }),
      output: Schema.Void,
    },
  });
}
