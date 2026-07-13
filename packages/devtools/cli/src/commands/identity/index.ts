//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { join } from './join';

export const identity = Command.make('identity').pipe(
  Command.withDescription("Manage this device's local identity."),
  Command.withSubcommands([join]),
);
