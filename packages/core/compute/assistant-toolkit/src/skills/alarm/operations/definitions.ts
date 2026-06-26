//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const SetAlarm = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.alarm.setAlarm'),
    name: 'Set alarm',
    icon: 'ph--alarm--regular',
    description: trim`
      Schedule an alarm to wake yourself up in the future.
      Provide exactly one of "in" (a duration from now) or "at" (an absolute time).
      When the alarm fires you will receive a prompt and can continue working.
      Setting a new alarm replaces any previously scheduled one.
    `,
  },
  input: Schema.Struct({
    in: Schema.optional(
      Schema.String.annotations({
        description: 'Duration from now expressed as "<number> <unit>", e.g. "30 seconds", "5 minutes", "2 hours".',
      }),
    ),
    at: Schema.optional(
      Schema.String.annotations({
        description: 'Absolute ISO-8601 timestamp to wake at, e.g. "2026-06-04T18:00:00.000Z".',
      }),
    ),
    message: Schema.optional(
      Schema.String.annotations({
        description: 'Optional reminder surfaced verbatim when the alarm fires.',
      }),
    ),
  }),
  output: Schema.String,
  services: [Harness.HarnessService],
});

export const GetCurrentDate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.alarm.getCurrentDate'),
    name: 'Get current date',
    icon: 'ph--clock--regular',
    description: 'Get the current date and time as an ISO-8601 string.',
  },
  // Anthropic requires `input_schema.type: object`; a single optional field keeps the schema a struct.
  input: Schema.Struct({
    timezone: Schema.optional(
      Schema.String.annotations({
        description: 'Optional IANA timezone name. Defaults to the process clock when omitted.',
      }),
    ),
  }),
  output: Schema.String,
});
