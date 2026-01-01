//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';
import * as Operation from '@dxos/operation';

import { meta } from '../meta';
import { translations } from '../translations';

const t = translations[0]['en-US'][meta.id];

export const UserFeedback = Schema.Struct({
  message: Format.Text.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(4_096),
    Schema.annotations({
      title: t['feedback textarea label'],
      description: t['feedback textarea placeholder'],
    }),
  ),
});

export type UserFeedback = Schema.Schema.Type<typeof UserFeedback>;

const OBSERVABILITY_OPERATION = `${meta.id}/operation`;

/**
 * Operations for the Observability plugin.
 */
export namespace ObservabilityOperation {
  export const Toggle = Operation.make({
    meta: {
      key: `${OBSERVABILITY_OPERATION}/toggle`,
      name: 'Toggle Observability',
      description: 'Toggle observability on or off.',
    },
    schema: {
      input: Schema.Struct({
        state: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Boolean,
    },
  });

  export const CaptureUserFeedback = Operation.make({
    meta: {
      key: `${OBSERVABILITY_OPERATION}/capture-feedback`,
      name: 'Capture User Feedback',
      description: 'Capture user feedback.',
    },
    schema: {
      input: UserFeedback,
      output: Schema.Void,
    },
  });

  export const SendEvent = Operation.make({
    meta: {
      key: `${OBSERVABILITY_OPERATION}/send-event`,
      name: 'Send Event',
      description: 'Send an observability event.',
    },
    schema: {
      input: Schema.Struct({
        name: Schema.String.annotations({ description: 'The name of the event.' }),
        properties: Schema.optional(Schema.Any).annotations({ description: 'Event properties.' }),
      }),
      output: Schema.Void,
    },
  });
}
