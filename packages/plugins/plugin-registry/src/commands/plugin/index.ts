//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { add } from './add';
import { disable } from './disable';
import { enable } from './enable';
import { list } from './list';
import { remove } from './remove';

export const plugin: Command.Command<any, any, any, any, any> = Command.make('plugin').pipe(
  Command.withDescription('Manage plugins.'),
  Command.withSubcommands([add, remove, enable, disable, list]),
);
