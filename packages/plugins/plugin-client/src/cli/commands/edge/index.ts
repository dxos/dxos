//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { deleteIdentity } from './delete-identity';
import { deleteSpace } from './delete-space';
import { inspectIdentity } from './inspect-identity';
import { inspectSpace } from './inspect-space';
import { status } from './status';

export const edge = Command.make('edge').pipe(
  Command.withDescription('EDGE commands.'),
  Command.withSubcommands([status, inspectSpace, inspectIdentity, deleteSpace, deleteIdentity]),
);
