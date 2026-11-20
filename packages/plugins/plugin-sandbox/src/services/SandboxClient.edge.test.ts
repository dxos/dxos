//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { SandboxClient } from './SandboxClient.ts';

/**
 * Manual: runs against a deployed sandbox-service, so it is skipped unless `DX_SANDBOX_EDGE_URL` names one,
 * e.g. `DX_SANDBOX_EDGE_URL=https://preview.dxos.network/sandbox`. Assumes the env's `noAuth` is set.
 */
const EDGE_URL = process.env.DX_SANDBOX_EDGE_URL;

describe.skipIf(!EDGE_URL)('SandboxClient against a deployed EDGE', { timeout: 5 * 60_000 }, () => {
  test('a served port answers at its public URL', async ({ expect }) => {
    const client = new SandboxClient(EDGE_URL ?? '', async () => undefined);
    const spaceId = SpaceId.random();
    const sandboxId = EntityId.random();
    const marker = `hello-${sandboxId}`;

    const { body, status } = await EffectEx.runPromise(
      Effect.gen(function* () {
        // Short-lived: the test leaves nothing behind once it expires.
        yield* client.createSandbox(spaceId, sandboxId, { name: 'manual-port-test', expiresIn: 10 * 60_000 });
        const written = yield* client.exec(spaceId, sandboxId, {
          command: `mkdir -p /root/site && echo ${marker} > /root/site/index.html`,
        });
        expect(written.success).toBe(true);

        const { url } = yield* client.exposePort(spaceId, sandboxId, 8080, {
          command: 'python3 -m http.server 8080 --directory /root/site',
        });
        log.info('exposed', { url });

        // No credentials: the token in the URL is all a browser would have.
        const httpClient = yield* HttpClient.HttpClient;
        const response = yield* httpClient.get(`${url}index.html`);
        return { status: response.status, body: yield* response.text };
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    );

    expect(status).toBe(200);
    expect(body.trim()).toBe(marker);
  });

  test('a job reads what is written to its stdin, resumes its output and is terminated', async ({ expect }) => {
    const client = new SandboxClient(EDGE_URL ?? '', async () => undefined);
    const spaceId = SpaceId.random();
    const sandboxId = EntityId.random();

    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* client.createSandbox(spaceId, sandboxId, { name: 'manual-job-test', expiresIn: 10 * 60_000 });
        const processId = yield* client.startProcess(spaceId, sandboxId, {
          command: 'while read -r line; do echo "got:$line"; done',
        });
        yield* client.writeStdin(spaceId, sandboxId, processId, Stream.make('one\n', 'two\n'));
        const read = yield* client.processOutput(spaceId, sandboxId, processId).pipe(
          Stream.filter((event) => event.type === 'stdout'),
          Stream.scan(
            () => '',
            (output: string, event) => output + (event.type === 'stdout' ? event.data : ''),
          ),
          Stream.takeUntil((output) => output === 'got:one\ngot:two\n'),
          Stream.runLast,
        );
        // A reader that comes back later skips what it already read.
        yield* client.writeStdin(spaceId, sandboxId, processId, Stream.make('three\n'));
        const resumed = yield* client
          .processOutput(spaceId, sandboxId, processId, { stdout: 'got:one\ngot:two\n'.length })
          .pipe(
            Stream.filter((event) => event.type === 'stdout'),
            Stream.take(1),
            Stream.runLast,
          );
        const running = yield* client.processState(spaceId, sandboxId, processId);
        const killed = yield* client.killProcess(spaceId, sandboxId, processId, 'SIGKILL');
        return { read, resumed, running, killed };
      }).pipe(Effect.provide(FetchHttpClient.layer)),
    );

    expect(result.read._tag === 'Some' && result.read.value).toBe('got:one\ngot:two\n');
    expect(result.resumed._tag === 'Some' && result.resumed.value).toEqual({ type: 'stdout', data: 'got:three\n' });
    expect(result.running.status).toBe('running');
    expect(result.killed.status).not.toBe('running');
  });
});
