//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { CommandConfig, print } from '@dxos/cli-util';
import { DX_CONFIG, getProfileConfigPath } from '@dxos/client-protocol';
import { trim } from '@dxos/util';

import { printProfileCreated } from './util';

// `edgeFeatures` must match Composer's defaults (see composer-app/dx.yml): without
// `signaling: true` the client silently falls back to an isolated in-memory signal manager and
// device invitations hang at "Connecting…" (host and guest never meet in the swarm).
const makeTemplate = (edgeUrl: string) => trim`
  version: 1
  runtime:
    client:
      storage:
        persistent: true
      edgeFeatures:
        signaling: true
        subductionReplicator: true
        feedReplicator: true
        agents: true
    services:
      edge:
        url: ${edgeUrl}
`;

const TEMPLATES = {
  default: makeTemplate('https://edge-production.dxos.workers.dev'),
  main: makeTemplate('https://edge-main.dxos.workers.dev'),
  dev: makeTemplate('https://edge.dxos.workers.dev'),
  local: makeTemplate('http://localhost:8787'),
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
    const path = yield* Path.Path;
    const profileName = name.pipe(Option.getOrElse(() => template));
    const configPath = getProfileConfigPath(DX_CONFIG, profileName);
    if (yield* fs.exists(configPath)) {
      throw new Error(`Profile ${profileName} already exists`);
    }

    yield* fs.makeDirectory(path.dirname(configPath), { recursive: true });
    yield* fs.writeFileString(configPath, TEMPLATES[template]);
    if (json) {
      yield* Console.log(JSON.stringify({ name: profileName, path: configPath }, null, 2));
    } else {
      yield* Console.log(print(printProfileCreated(profileName, configPath)));
    }
  }),
);
