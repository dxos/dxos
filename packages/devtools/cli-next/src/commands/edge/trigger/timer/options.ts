//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

export const Cron = Options.text('cron').pipe(
  Options.withDescription('The cron expression to use for the timer trigger.'),
);
