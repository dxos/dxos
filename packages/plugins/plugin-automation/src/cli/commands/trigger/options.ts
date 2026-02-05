//
// Copyright 2025 DXOS.org
//

import * as Options from '@effect/cli/Options';
import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

export const TriggerId = Options.text('id').pipe(Options.withDescription('The id of the trigger.'));

export const Enabled = Options.boolean('enabled', { ifPresent: true }).pipe(
  Options.withDescription('Whether the trigger is enabled.'),
);

export const Input = Options.keyValueMap('input').pipe(
  Options.withDescription("Input data to pass to the function. Must match the function's input schema."),
);

//
// Subscription
//

export const Typename = Options.text('typename').pipe(
  Options.withDescription('The type name to query for the subscription trigger.'),
);

export const Deep = Options.boolean('deep', { ifPresent: true }).pipe(
  Options.withDescription('Watch changes to nested properties (not just creation).'),
);

export const Delay = Options.integer('delay').pipe(
  Options.withDescription('Debounce changes with a delay in milliseconds.'),
);

//
// Timer
//

export const Cron = Options.text('cron').pipe(
  Options.withDescription('The cron expression to use for the timer trigger.'),
);

//
// Queue
//

// TODO(dmaretskyi): Extract
const DXNSchema = Schema.String.pipe(
  Schema.transform(Schema.instanceOf(DXN), {
    decode: (value: string) => DXN.parse(value),
    encode: (value: DXN) => value.toString(),
  }),
);

export const Queue = Options.text('queue').pipe(
  Options.withDescription('The DXN of the queue for the queue trigger.'),
  Options.withSchema(DXNSchema),
);
