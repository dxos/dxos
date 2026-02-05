//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { close } from './close';
import { create } from './create';
import { info } from './info';
import { join } from './join';
import { list } from './list';
import { members } from './members';
import { open } from './open';
import { schema } from './schema';
import { share } from './share';
import { sync } from './sync';

export const space = Command.make('space').pipe(
  Command.withDescription('Manage ECHO spaces.'),
  Command.withSubcommands([close, create, info, join, list, members, open, schema, share, sync]),
);
