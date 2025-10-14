//
// Copyright 2025 DXOS.org
//

import * as Options from '@effect/cli/Options';

export const Cron = Options.text('cron').pipe(
  Options.withDescription('The cron expression to use for the timer trigger.'),
);
