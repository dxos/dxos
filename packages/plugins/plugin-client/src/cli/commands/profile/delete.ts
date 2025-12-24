//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, print } from '@dxos/cli-util';
import { DX_CONFIG, getProfilePath } from '@dxos/client-protocol';

import { printProfileDeleted } from './util';

export const del = Command.make(
  'delete',
  {
    name: Options.text('name').pipe(Options.withDescription('Profile name'), Options.optional),
  },
  Effect.fnUntraced(function* ({ name }) {
    const { json } = yield* CommandConfig;
    const fs = yield* FileSystem.FileSystem;
    const profileName = name.pipe(Option.getOrElse(() => 'default'));
    yield* fs.remove(`${getProfilePath(DX_CONFIG, profileName)}.yml`);
    if (json) {
      yield* Console.log(JSON.stringify({ name: profileName, deleted: true }, null, 2));
    } else {
      yield* Console.log(print(printProfileDeleted(profileName)));
    }
  }),
);
