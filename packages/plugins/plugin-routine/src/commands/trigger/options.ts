//
// Copyright 2025 DXOS.org
//

import * as Options from 'effect/unstable/cli/Flag';

export const TriggerId = Options.String('id').pipe(Options.withDescription('The id of the trigger.'));

export const Enabled = Options.Boolean('enabled').pipe(
  Options.withDefault(false),
  Options.withDescription('Whether the trigger is enabled.'),
);

export const Input = Options.KeyValuePair('input').pipe(
  Options.withDescription("Input data to pass to the function. Must match the function's input schema."),
);

//
// Subscription
//

export const Typename = Options.String('typename').pipe(
  Options.withDescription('The type name to query for the subscription trigger.'),
);

export const Deep = Options.Boolean('deep').pipe(
  Options.withDefault(false),
  Options.withDescription('Watch changes to nested properties (not just creation).'),
);

export const Delay = Options.Int('delay').pipe(
  Options.withDescription('Debounce changes with a delay in milliseconds.'),
);

//
// Timer
//

export const Cron = Options.String('cron').pipe(
  Options.withDescription('The cron expression to use for the timer trigger.'),
);

//
// Feed
//

export const Feed = Options.String('feed').pipe(
  Options.withDescription('The EID of the feed for the feed trigger (echo://<spaceId>/<objectId>).'),
);
