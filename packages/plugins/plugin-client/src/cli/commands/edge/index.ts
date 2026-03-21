//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { identity } from './identity';
import { space } from './space';
import { status } from './status';

export const edge: Command.Command<any, any, any, any> = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([status, space, identity]),
);
