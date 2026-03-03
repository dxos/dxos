//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { CommandConfig, print } from '@dxos/cli-util';
import { DX_CONFIG, getProfilePath } from '@dxos/client-protocol';
import { trim } from '@dxos/util';

import { printProfileCreated } from './util';

const TEMPLATES = {
  default: trim`
    version: 1
    runtime:
      client:
        storage:
          persistent: true
      services:
        edge:
          url: https://edge-production.dxos.workers.dev
  `,
  main: trim`
    version: 1
    runtime:
      client:
        storage:
          persistent: true
      services:
        edge:
          url: https://edge-main.dxos.workers.dev
  `,
  dev: trim`
    version: 1
    runtime:
      client:
        storage:
          persistent: true
      services:
        edge:
          url: https://edge.dxos.workers.dev
  `,
  local: trim`
    version: 1
    runtime:
      client:
        storage:
          persistent: true
      services:
        edge:
          url: http://localhost:8787
  `,
} as const;

export const create = Command.make(
  'create',
  {
    template: Options.choice('template', Record.keys(TEMPLATES)).pipe(
      Options.withDescription('Template to use'),
      Options.withDefault('default'),
    ),
    name: Options.text('name').pipe(Options.withDescription('Profile name'), Options.optional),
  },
  Effect.fnUntraced(function* ({ template, name }) {
    const { json } = yield* CommandConfig;
    const fs = yield* FileSystem.FileSystem;
    const profileName = name.pipe(Option.getOrElse(() => template));
    const profilePath = `${getProfilePath(DX_CONFIG, profileName)}.yml`;
    if (yield* fs.exists(profilePath)) {
      throw new Error(`Profile ${profileName} already exists`);
    }

    yield* fs.writeFileString(profilePath, TEMPLATES[template]);
    if (json) {
      yield* Console.log(JSON.stringify({ name: profileName, path: profilePath }, null, 2));
    } else {
      yield* Console.log(print(printProfileCreated(profileName, profilePath)));
    }
  }),
);
