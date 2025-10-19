//
// Copyright 2025 DXOS.org
//

import * as Options from '@effect/cli/Options';

export const TriggerId = Options.text('id').pipe(Options.withDescription('The id of the trigger.'));

export const Enabled = Options.boolean('enabled', { ifPresent: true }).pipe(
  Options.withDescription('Whether the trigger is enabled.'),
);

export const Input = Options.keyValueMap('input').pipe(
  Options.withDescription("Input data to pass to the function. Must match the function's input schema."),
);
