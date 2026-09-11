//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { close } from './close/index.ts';
import { create } from './create/index.ts';
import { exportSpace } from './export/index.ts';
import { importSpace } from './import/index.ts';
import { info } from './info/index.ts';
import { join } from './join/index.ts';
import { list } from './list/index.ts';
import { members } from './members/index.ts';
import { open } from './open/index.ts';
import { schema } from './schema/index.ts';
import { share } from './share/index.ts';
import { sync } from './sync/index.ts';

export const space = Command.make('space').pipe(
  Command.withDescription('Manage ECHO spaces.'),
  Command.withSubcommands([
    close,
    create,
    exportSpace,
    importSpace,
    info,
    join,
    list,
    members,
    open,
    schema,
    share,
    sync,
  ]),
);
