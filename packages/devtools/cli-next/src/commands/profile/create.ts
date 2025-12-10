//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { DX_CONFIG, getProfilePath } from '@dxos/client-protocol';
import { trim } from '@dxos/util';

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
    const fs = yield* FileSystem.FileSystem;
    const profileName = name.pipe(Option.getOrElse(() => template));

    if (yield* fs.exists(`${getProfilePath(DX_CONFIG, profileName)}.yml`)) {
      throw new Error(`Profile ${profileName} already exists`);
    }

    yield* fs.writeFileString(`${getProfilePath(DX_CONFIG, profileName)}.yml`, TEMPLATES[template]);
    console.log(`Profile ${profileName} created`);
  }),
);
