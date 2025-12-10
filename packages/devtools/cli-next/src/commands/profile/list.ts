//
// Copyright 2025 DXOS.org
//

import { extname, join } from 'node:path';

import * as Command from '@effect/cli/Command';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Yaml from 'yaml';

import { Config } from '@dxos/client';
import { DX_CONFIG, DX_DATA, getProfilePath } from '@dxos/client-protocol';

import { CommandConfig } from '../../services';

export const list = Command.make(
  'list',
  {},
  Effect.fnUntraced(function* (args) {
    const { profile: currentProfile } = yield* CommandConfig;
    const fs = yield* FileSystem.FileSystem;
    const files = yield* fs.readDirectory(join(DX_CONFIG, 'profile'));
    const profiles = yield* Effect.forEach(
      files,
      Effect.fnUntraced(function* (filename) {
        const name = filename.slice(0, -extname(filename).length);
        const fullPath = join(DX_CONFIG, 'profile', filename);
        const configContent = yield* fs.readFileString(fullPath);
        const configValues = Yaml.parse(configContent);
        const config = new Config(configValues);
        return {
          name,
          isCurrent: name === currentProfile,
          fullPath,
          storagePath: getProfilePath(configValues.runtime.client.storage.dataRoot ?? DX_DATA, name),
          edge: config.values.runtime?.services?.edge?.url,
        };
      }),
    );

    for (const profile of profiles) {
      console.log(profile.name);
      // console.log(
      // Chalk.underline(`Profile: ${Chalk.bold(profile.name)}`),
      // profile.isCurrent ? Chalk.green(' (current)') : '',
      // );
      console.log('  Full path:', profile.fullPath);
      console.log('  Storage path:', profile.storagePath);
      console.log('  EDGE:', profile.edge);
      console.log();
    }
  }),
);
