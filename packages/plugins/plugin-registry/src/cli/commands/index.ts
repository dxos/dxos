//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { disable } from './disable';
import { enable } from './enable';
import { list } from './list';

export const plugin: Command.Command<any, any, any, any> = Command.make('plugin').pipe(
  Command.withDescription('Manage plugins.'),
  Command.withSubcommands([enable, disable, list]),
);
