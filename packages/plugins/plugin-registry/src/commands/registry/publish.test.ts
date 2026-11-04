//
// Copyright 2026 DXOS.org
//

import * as NodeServices from '@effect/platform-node/NodeServices';
import * as Command from 'effect/cli/Command';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { ClientService } from '@dxos/client';

import * as BundleDescriber from '../../BundleDescriber.ts';
import { publish } from './publish.ts';

class InitFailed extends Data.TaggedError('InitFailed') {}

const EDGE_URL = 'http://edge.test';
const MODULE_URL = `${EDGE_URL}/registry/modules/org.example.plugin/1.0.0/manifest.json`;

describe('registry publish', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-publish-'));
    fs.writeFileSync(
      path.join(dir, 'dx.config.mjs'),
      `export default { plugin: { key: 'org.example.plugin', name: 'Example' }, publish: { outputDirectory: 'dist' } };\n`,
    );
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(
      path.join(dir, 'dist', 'manifest.json'),
      JSON.stringify({ key: 'org.example.plugin', name: 'Example', version: '1.0.0' }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('--upload-only --edge-url uploads without resolving the client', async ({ expect }) => {
    const fetchMock = vi.fn(
      async (_input: unknown, _init?: RequestInit) =>
        new Response(JSON.stringify({ success: true, data: { moduleUrl: MODULE_URL } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    let clientResolved = false;
    const handle = ClientService.of({
      client: Effect.suspend(() => {
        clientResolved = true;
        return Effect.die(new InitFailed());
      }),
    });

    const describer = BundleDescriber.Service.of({
      buildEnv: Effect.succeed({}),
      describe: () => Effect.succeed('ok'),
    });

    await Command.runWith(publish, { version: '0.0.0' })([
      '--dir',
      dir,
      '--no-build',
      '--upload-only',
      '--edge-url',
      EDGE_URL,
    ]).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          Layer.succeed(BundleDescriber.Service, describer),
          Layer.succeed(ClientService, handle),
        ),
      ),
      Effect.runPromise,
    );

    expect(clientResolved).toBe(false);
    const upload = fetchMock.mock.calls.find(([input]) => String(input).startsWith(`${EDGE_URL}/registry/upload`));
    expect(upload).toBeDefined();
  });
});
