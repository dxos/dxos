//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';

import { Common, withTimeout } from '@dxos/cli-util';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import { type ExportArgs, exportSpaceToFile, outputOption } from '../util';

export const handler = (args: ExportArgs) =>
  exportSpaceToFile({ ...args, format: SpaceArchive.Format.BINARY, label: 'Archive' });

export const archive = Command.make(
  'archive',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    output: outputOption,
  },
  (args) => handler(args).pipe(withTimeout),
).pipe(Command.withDescription('Write a binary archive of a space to disk.'));
