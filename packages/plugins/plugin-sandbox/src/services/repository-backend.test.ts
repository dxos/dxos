//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { makeRepositoryBackend } from './repository-backend.ts';
import { RepositoryClient } from './RepositoryClient.ts';

const RECORD = {
  id: 'repo',
  spaceId: 'space',
  defaultBranch: 'main',
  remote: 'https://account.artifacts.cloudflare.net/git/dev/space-repo.git',
  createdAt: '2026-09-29T00:00:00.000Z',
  updatedAt: '2026-09-29T00:00:00.000Z',
};

type Route = (request: { method: string; url: URL; body?: unknown }) => { status: number; body: unknown };

/** A backend whose requests are answered by `route`, recording each as `METHOD /path?query`. */
const stub = (route: Route) => {
  const requests: string[] = [];
  const layer = Layer.succeed(HttpClient.HttpClient)(
    HttpClient.make((request, url) => {
      requests.push(`${request.method} ${url.pathname}${url.search}`);
      const body =
        request.body._tag === 'Uint8Array' ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined;
      const response = route({ method: request.method, url, body });
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(response.body), {
            status: response.status,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      );
    }),
  );
  const backend = makeRepositoryBackend(
    () => new RepositoryClient('http://localhost:8792', async () => 'Bearer x'),
    layer,
  );
  return { backend, requests };
};

const notFound = { status: 404, body: { success: false, error: { message: 'Repository not found.' } } };

describe('repository backend', () => {
  test('a read of a repository EDGE does not have creates it, then reads again', async ({ expect }) => {
    let created = false;
    const { backend, requests } = stub(({ method, url }) => {
      if (method === 'PUT') {
        created = true;
        return { status: 201, body: { success: true, data: RECORD } };
      }
      if (url.pathname.endsWith('/branches')) {
        return created
          ? { status: 200, body: { success: true, data: { defaultBranch: 'main', branches: [] } } }
          : notFound;
      }
      return notFound;
    });

    const branches = await EffectEx.runPromise(backend.branches('space', 'repo'));
    expect(branches).toEqual({ defaultBranch: 'main', branches: [] });
    expect(requests).toEqual([
      'GET /spaces/space/repositories/repo/branches',
      'PUT /spaces/space/repositories/repo',
      'GET /spaces/space/repositories/repo/branches',
    ]);
  });

  test('any other failure is reported, not retried', async ({ expect }) => {
    const { backend, requests } = stub(() => ({ status: 500, body: { success: false } }));
    const exit = await EffectEx.runPromise(Effect.exit(backend.tree('space', 'repo', { ref: 'main' })));
    expect(exit._tag).toBe('Failure');
    expect(requests).toEqual(['GET /spaces/space/repositories/repo/tree?ref=main']);
  });

  test('tree and file reads carry the ref and path as query parameters', async ({ expect }) => {
    const { backend, requests } = stub(({ url }) =>
      url.pathname.endsWith('/files')
        ? {
            status: 200,
            body: { success: true, data: { path: 'src/a.ts', hash: 'h', content: 'x', encoding: 'utf-8', size: 1 } },
          }
        : { status: 200, body: { success: true, data: { commit: 'c', entries: [] } } },
    );
    await EffectEx.runPromise(backend.tree('space', 'repo', { ref: 'feature', path: 'src' }));
    const file = await EffectEx.runPromise(backend.readFile('space', 'repo', { path: 'src/a.ts' }));
    expect(file.content).toBe('x');
    expect(requests).toEqual([
      'GET /spaces/space/repositories/repo/tree?ref=feature&path=src',
      'GET /spaces/space/repositories/repo/files?path=src%2Fa.ts',
    ]);
  });
});
