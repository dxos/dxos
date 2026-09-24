//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { add } from './add.ts';
import { disable } from './disable.ts';
import { enable } from './enable.ts';
import { list } from './list.ts';
import { remove } from './remove.ts';

export const plugin: Command.Command<any, any, any, any, any> = Command.make('plugin').pipe(
  Command.withDescription('Manage plugins.'),
  Command.withSubcommands([add, remove, enable, disable, list]),
);
