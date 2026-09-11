//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig, print } from '@dxos/cli-util';
import { DX_CONFIG, getProfileConfigPath } from '@dxos/client-protocol';

import { printProfileDeleted } from './util.ts';

export const del = Command.make(
  'delete',
  {
    name: Options.string('name').pipe(Options.withDescription('Profile name'), Options.optional),
  },
  Effect.fnUntraced(function* ({ name }) {
    const { json } = yield* CommandConfig;
    const fs = yield* FileSystem.FileSystem;
    const profileName = name.pipe(Option.getOrElse(() => 'default'));
    const configPath = getProfileConfigPath(DX_CONFIG, profileName);
    const pluginsPath = `${DX_CONFIG}/plugins/${profileName}.yml`;
    yield* fs.remove(configPath).pipe(Effect.ignore);
    yield* fs.remove(pluginsPath).pipe(Effect.ignore);
    if (json) {
      yield* Console.log(JSON.stringify({ name: profileName, deleted: true }, null, 2));
    } else {
      yield* Console.log(print(printProfileDeleted(profileName)));
    }
  }),
);
