//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as Schema from 'effect/Schema';

import * as SandboxService from '../types/SandboxService.ts';
import { ExecResult, FileEntry, SandboxRecord } from './SandboxClient.ts';

/** Backstop for a sidecar that never answers; a command's own `timeout` bounds it inside. */
const REQUEST_TIMEOUT = Duration.minutes(20);

const ErrorBody = Schema.Struct({ error: Schema.String });

/**
 * A {@link SandboxService.Backend} served by the local sandbox sidecar (`local/server.ts`) at `url`,
 * for a runtime that cannot spawn processes itself. `token` is the sidecar's per-launch secret.
 */
export const make = (url: string, token: string): SandboxService.Backend => {
  const call = <A, I>(method: string, body: unknown, schema: Schema.Codec<A, I>) =>
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const request = yield* HttpClientRequest.bodyJson(
        HttpClientRequest.post(`${url.replace(/\/$/, '')}/${method}`).pipe(
          HttpClientRequest.setHeader('Authorization', `Bearer ${token}`),
        ),
        body,
      );
      const response = yield* httpClient.execute(request);
      const json = yield* response.json;
      if (response.status !== 200) {
        const { error } = yield* Schema.decodeUnknownEffect(ErrorBody)(json);
        return yield* Effect.fail(new SandboxService.SandboxError({ message: error }));
      }
      return yield* Schema.decodeUnknownEffect(schema)(json);
    }).pipe(
      Effect.timeout(REQUEST_TIMEOUT),
      Effect.scoped,
      Effect.provide(FetchHttpClient.layer),
      Effect.mapError((cause) =>
        cause instanceof SandboxService.SandboxError
          ? cause
          : new SandboxService.SandboxError({ message: `local sandbox: ${String(cause)}`, cause }),
      ),
    );

  return {
    kind: 'local',
    create: (spaceId, sandboxId, options) => call('create', { spaceId, sandboxId, options }, SandboxRecord),
    exec: (spaceId, sandboxId, request) => call('exec', { spaceId, sandboxId, request }, ExecResult),
    readFileBytes: (spaceId, sandboxId, path) =>
      call('read', { spaceId, sandboxId, path }, Schema.Struct({ content: Schema.String, type: Schema.String })).pipe(
        Effect.flatMap(({ content, type }) =>
          Schema.decodeUnknownEffect(Schema.Uint8ArrayFromBase64)(content).pipe(
            Effect.map((bytes) => ({ bytes, type })),
            Effect.mapError((cause) => new SandboxService.SandboxError({ message: 'malformed file content', cause })),
          ),
        ),
      ),
    writeFile: (spaceId, sandboxId, path, content) =>
      Schema.encodeEffect(Schema.Uint8ArrayFromBase64)(content).pipe(
        Effect.mapError((cause) => new SandboxService.SandboxError({ message: 'unencodable file content', cause })),
        Effect.flatMap((encoded) => call('write', { spaceId, sandboxId, path, content: encoded }, Schema.Unknown)),
        Effect.asVoid,
      ),
    listFiles: (spaceId, sandboxId, path) =>
      call('list', { spaceId, sandboxId, path }, Schema.Struct({ entries: Schema.Array(FileEntry) })).pipe(
        Effect.map(({ entries }) => entries),
      ),
    // The sidecar listens on loopback only, so there is no public address to hand out.
    exposePort: () =>
      Effect.fail(new SandboxService.SandboxError({ message: 'Local sandboxes cannot expose ports; use EDGE.' })),
    publish: (spaceId, sandboxId, path) =>
      call('publish', { spaceId, sandboxId, path }, Schema.Struct({ path: Schema.String })).pipe(
        Effect.map(({ path: served }) => `${url.replace(/\/$/, '')}${served}`),
      ),
  };
};
