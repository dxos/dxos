//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import type * as HttpClient from 'effect/unstable/http/HttpClient';

import { type Client } from '@dxos/client';

import * as SandboxService from '../types/SandboxService.ts';
import { encodeExecCommand } from './exec-command.ts';
import { createSandboxClient } from './sandbox-url.ts';
import { type SandboxClient, type SandboxRequestError } from './SandboxClient.ts';

/**
 * Sandboxes run by EDGE's sandbox-service. The REST client is built per call: the service URL comes
 * from config that may be missing, which is then an error of the call rather than of the runtime.
 */
export const makeEdgeBackend = (client: Client): SandboxService.Backend => {
  const request = <T>(
    send: (sandboxClient: SandboxClient) => Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>,
  ): Effect.Effect<T, SandboxService.SandboxError> =>
    Effect.try({
      try: () => createSandboxClient(client),
      catch: (cause) => new SandboxService.SandboxError({ message: describeError(cause), cause }),
    }).pipe(
      Effect.flatMap((sandboxClient) =>
        send(sandboxClient).pipe(
          Effect.mapError((cause) => new SandboxService.SandboxError({ message: describeError(cause), cause })),
          Effect.provide(FetchHttpClient.layer),
        ),
      ),
    );

  return {
    kind: 'edge',
    create: (spaceId, sandboxId, options) =>
      request((sandboxClient) => sandboxClient.createSandbox(spaceId, sandboxId, options)),
    exec: (spaceId, sandboxId, { command, ...options }) =>
      request((sandboxClient) =>
        sandboxClient.exec(spaceId, sandboxId, { command: encodeExecCommand(command), ...options }),
      ),
    readFileBytes: (spaceId, sandboxId, path) =>
      request((sandboxClient) => sandboxClient.readFileBytes(spaceId, sandboxId, path)),
    // The service stores text only, so binary content does not survive the trip.
    writeFile: (spaceId, sandboxId, path, content) =>
      request((sandboxClient) => sandboxClient.writeFile(spaceId, sandboxId, path, new TextDecoder().decode(content))),
    listFiles: (spaceId, sandboxId, path) =>
      request((sandboxClient) => sandboxClient.listFiles(spaceId, sandboxId, path)),
  };
};

const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
