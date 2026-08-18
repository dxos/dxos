//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';
import * as Record from 'effect/Record';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

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

// Mirrors `localDevConfig` in packages/sdk/config/src/config-service.ts — the `main`/staging
// overrides Composer's `dx-local.yml` applies on top of `dx.yml` for its local dev server, and
// what a fresh profile auto-bootstraps to under `DX_LOCAL_DEV`. Keep the two in sync by hand: this
// file can't take a static `yaml` import without pulling the parser into the browser boot graph
// (see the same constraint noted in config-service.ts).
const mainTemplate = trim`
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
        url: https://main.dxos.network
      iceProviders:
        - urls: https://dxos.network/ice
      sandbox:
        url: https://sandbox-service.dxos.workers.dev
      ipfs:
        server: https://api.ipfs.dxos.network/api/v0
        gateway: https://gateway.ipfs.dxos.network/ipfs
`;

const TEMPLATES = {
  default: makeTemplate('https://dxos.network'),
  main: mainTemplate,
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
    name: Options.string('name').pipe(Options.withDescription('Profile name'), Options.optional),
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
