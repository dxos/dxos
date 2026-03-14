//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Yaml from 'yaml';

import { CommandConfig, printList } from '@dxos/cli-util';
import { Config } from '@dxos/client';
import { DX_CONFIG, DX_DATA, getProfilePath } from '@dxos/client-protocol';

import { printProfile } from './util';

export const list = Command.make(
  'list',
  {},
  Effect.fnUntraced(function* () {
    const { profile: currentProfile } = yield* CommandConfig;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const profileDir = path.join(DX_CONFIG, 'profile');
    const entries = yield* fs.readDirectory(profileDir);
    const profileFiles = entries.filter((entry) => entry.endsWith('.yml'));
    const profiles = yield* Effect.forEach(profileFiles, (filename) =>
      Effect.gen(function* () {
        const name = filename.slice(0, -4);
        const configPath = path.join(profileDir, filename);
        const configContent = yield* fs
          .readFileString(configPath)
          .pipe(Effect.catchTag('SystemError', () => Effect.succeed('{}')));
        const configValues = Yaml.parse(configContent) ?? {};
        const config = new Config(configValues);
        return {
          name,
          isCurrent: name === currentProfile,
          fullPath: configPath,
          storagePath: getProfilePath(configValues?.runtime?.client?.storage?.dataRoot ?? DX_DATA, name),
          edge: config.values.runtime?.services?.edge?.url,
        };
      }),
    );

    const { json } = yield* CommandConfig;
    if (json) {
      yield* Console.log(JSON.stringify(profiles, null, 2));
    } else {
      const formatted = profiles.map(printProfile);
      yield* Console.log(printList(formatted));
    }
  }),
);
