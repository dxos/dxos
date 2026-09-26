//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import type * as HttpClient from 'effect/unstable/http/HttpClient';

import { encodeExecCommand } from './exec-command.ts';
import { type SandboxBackend, SandboxError } from './SandboxBackend.ts';
import { type SandboxClient, type SandboxRequestError } from './SandboxClient.ts';

/** Sandboxes run by EDGE's sandbox-service, reached through `client`. */
export const makeEdgeSandboxBackend = (client: SandboxClient): SandboxBackend => ({
  kind: 'edge',
  create: (spaceId, sandboxId, options) => request(client.createSandbox(spaceId, sandboxId, options)),
  exec: (spaceId, sandboxId, { command, ...options }) =>
    request(client.exec(spaceId, sandboxId, { command: encodeExecCommand(command), ...options })),
  readFileBytes: (spaceId, sandboxId, path) => request(client.readFileBytes(spaceId, sandboxId, path)),
  // The service stores text only, so binary content does not survive the trip.
  writeFile: (spaceId, sandboxId, path, content) =>
    request(client.writeFile(spaceId, sandboxId, path, new TextDecoder().decode(content))),
  listFiles: (spaceId, sandboxId, path) => request(client.listFiles(spaceId, sandboxId, path)),
});

const request = <T>(
  effect: Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>,
): Effect.Effect<T, SandboxError> =>
  effect.pipe(
    Effect.mapError((cause) => new SandboxError({ message: describeError(cause), cause })),
    Effect.provide(FetchHttpClient.layer),
  );

const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
