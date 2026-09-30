//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EffectEx } from '@dxos/effect';

import * as HttpBackend from '../services/HttpBackend.ts';
import { canRunLocalSandboxes } from '../testing/probe.ts';
import { LocalSandboxBackend } from './LocalSandboxBackend.ts';
import { type SandboxServer, serve } from './server.ts';

const unavailable = !(await canRunLocalSandboxes());

const TOKEN = 'test-token-0123456789';
const SPACE_ID = 'space-a';

describe.skipIf(unavailable)('local sandbox server', { timeout: 60_000 }, () => {
  let root: string;
  let backend: LocalSandboxBackend;
  let server: SandboxServer;
  let url: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'dx-sandbox-server-'));
    backend = new LocalSandboxBackend({ root, path: process.env.PATH });
    server = await serve({ backend, token: TOKEN });
    url = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    await server.close();
    await EffectEx.runPromise(Effect.ignore(backend.close()));
    await rm(root, { recursive: true, force: true });
  });

  it.effect('serves every backend call over HTTP', () =>
    Effect.gen(function* () {
      const remote = HttpBackend.make(url, TOKEN);
      const record = yield* remote.create(SPACE_ID, 'sbx1', { name: 'remote' });
      expect(record).toMatchObject({ id: 'sbx1', name: 'remote', baseImage: 'local' });

      const result = yield* remote.exec(SPACE_ID, 'sbx1', { command: 'echo "$GREETING"', env: { GREETING: 'hi' } });
      expect(result).toMatchObject({ exitCode: 0, success: true, stdout: 'hi\n' });

      // Every byte value, so an encoding that is not byte-exact shows.
      const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);
      yield* remote.writeFile(SPACE_ID, 'sbx1', 'dir/all.bin', bytes);
      const read = yield* remote.readFileBytes(SPACE_ID, 'sbx1', '/workspace/dir/all.bin');
      expect(read.bytes).toEqual(bytes);
      expect(yield* remote.listFiles(SPACE_ID, 'sbx1', 'dir')).toEqual([{ name: 'all.bin', type: 'file', size: 256 }]);
    }),
  );

  it.effect('reports backend failures as sandbox errors', () =>
    Effect.gen(function* () {
      const remote = HttpBackend.make(url, TOKEN);
      const error = yield* remote.readFileBytes(SPACE_ID, 'sbx1', '/etc/passwd').pipe(Effect.flip);
      expect(error.message).toMatch(/outside the sandbox workspace/);
    }),
  );

  it.effect('refuses requests without the token', () =>
    Effect.gen(function* () {
      const error = yield* HttpBackend.make(url, 'wrong-token')
        .exec(SPACE_ID, 'sbx1', { command: 'true' })
        .pipe(Effect.flip);
      expect(error.message).toBe('unauthorized');
    }),
  );

  it('refuses a rebound host name', async () => {
    const { request } = await import('node:http');
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const outgoing = request(
        {
          host: '127.0.0.1',
          port: server.port,
          path: '/exec',
          method: 'POST',
          headers: { host: `attacker.example:${server.port}`, authorization: `Bearer ${TOKEN}` },
        },
        (response) => resolve(response.statusCode),
      );
      outgoing.on('error', reject);
      outgoing.end('{}');
    });
    expect(status).toBe(403);
  });

  it.effect('serves a published directory without the token, and nothing outside it', () =>
    Effect.gen(function* () {
      const remote = HttpBackend.make(url, TOKEN);
      yield* remote.create(SPACE_ID, 'sbx2', {});
      yield* remote.writeFile(SPACE_ID, 'sbx2', 'site/dist/index.mjs', new TextEncoder().encode('export default 1;'));
      yield* remote.writeFile(SPACE_ID, 'sbx2', 'site/secret.txt', new TextEncoder().encode('secret'));
      const publish = remote.publish;
      expect(publish).toBeDefined();
      if (!publish) {
        return;
      }
      const base = yield* publish(SPACE_ID, 'sbx2', 'site/dist');
      expect(yield* publish(SPACE_ID, 'sbx2', 'site/dist')).toBe(base);
      expect(base).toMatch(new RegExp(`^${url}/files/[0-9a-f]{32}/$`));

      const module = yield* Effect.promise(() => fetch(`${base}index.mjs`));
      expect(module.status).toBe(200);
      expect(module.headers.get('content-type')).toBe('text/javascript');
      expect(module.headers.get('access-control-allow-origin')).toBe('*');
      const foreign = yield* Effect.promise(() =>
        fetch(`${base}index.mjs`, { headers: { origin: 'https://example.com' } }),
      );
      expect(foreign.headers.get('access-control-allow-origin')).toBeNull();
      const app = yield* Effect.promise(() =>
        fetch(`${base}index.mjs`, { headers: { origin: 'http://localhost:26777' } }),
      );
      expect(app.headers.get('access-control-allow-origin')).toBe('http://localhost:26777');
      expect(yield* Effect.promise(() => module.text())).toBe('export default 1;');

      for (const path of ['..%2Fsecret.txt', '../secret.txt', 'missing.mjs', '']) {
        const response = yield* Effect.promise(() => fetch(`${base}${path}`));
        expect(response.status, path).toBe(404);
      }
      const unknown = yield* Effect.promise(() => fetch(`${url}/files/${'0'.repeat(32)}/index.mjs`));
      expect(unknown.status).toBe(404);

      // A symlink the sandbox itself wrote must not carry a host file out through the published URL.
      yield* remote.exec(SPACE_ID, 'sbx2', { command: 'ln -s /etc/hostname site/dist/leak' });
      const leak = yield* Effect.promise(() => fetch(`${base}leak`));
      expect(leak.status).toBe(404);
      expect(module.headers.get('x-content-type-options')).toBe('nosniff');

      const error = yield* publish(SPACE_ID, 'sbx2', 'site/secret.txt').pipe(Effect.flip);
      expect(error.message).toMatch(/not a directory/);
    }),
  );

  it('allows the headers a preflight asks for, so instrumented fetches reach the token check', async () => {
    const response = await fetch(`${url}/exec`, {
      method: 'OPTIONS',
      headers: {
        'origin': 'http://localhost:26777',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type,traceparent',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toBe('authorization,content-type,traceparent');
  });

  it('rejects malformed calls', async () => {
    const response = await fetch(`${url}/exec`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ spaceId: SPACE_ID, sandboxId: 'sbx1' }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'missing field: request' });
  });
});
