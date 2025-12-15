//
// Copyright 2025 DXOS.org
//

import * as Options from '@effect/cli/Options';

export const Typename = Options.text('typename').pipe(
  Options.withDescription('The type name to query for the subscription trigger.'),
);

export const Deep = Options.boolean('deep', { ifPresent: true }).pipe(
  Options.withDescription('Watch changes to nested properties (not just creation).'),
);

export const Delay = Options.integer('delay').pipe(
  Options.withDescription('Debounce changes with a delay in milliseconds.'),
);
