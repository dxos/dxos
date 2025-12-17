//
// Copyright 2025 DXOS.org
//

import { extname, join } from 'node:path';

import * as Command from '@effect/cli/Command';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Yaml from 'yaml';

import { Config } from '@dxos/client';
import { DX_CONFIG, DX_DATA, getProfilePath } from '@dxos/client-protocol';

import { CommandConfig } from '../../services';
import { printList } from '../../util';

import { printProfile } from './util';

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

    const { json } = yield* CommandConfig;
    if (json) {
      yield* Console.log(JSON.stringify(profiles, null, 2));
    } else {
      const formatted = profiles.map(printProfile);
      yield* Console.log(printList(formatted));
    }
  }),
);
