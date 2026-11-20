//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import type * as HttpClient from 'effect/http/HttpClient';
import * as Stream from 'effect/Stream';

import * as SandboxService from '../types/SandboxService.ts';
import { encodeExecCommand } from './exec-command.ts';
import { type EdgeContext, createSandboxClient } from './sandbox-url.ts';
import { type ProcessState, type SandboxClient, type SandboxRequestError } from './SandboxClient.ts';

/**
 * Sandboxes run by EDGE's sandbox-service. The REST client is built per call: the service URL comes
 * from config that may be missing, which is then an error of the call rather than of the runtime.
 * `resolve` is read per call for the same reason: the client arrives after the runtime is built.
 */
export const makeEdgeBackend = (resolve: () => EdgeContext): SandboxService.Backend => {
  const toSandboxError = (cause: unknown) => new SandboxService.SandboxError({ message: describeError(cause), cause });

  const request = <T>(
    send: (sandboxClient: SandboxClient) => Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>,
  ): Effect.Effect<T, SandboxService.SandboxError> =>
    Effect.try({
      try: () => createSandboxClient(resolve()),
      catch: toSandboxError,
    }).pipe(
      Effect.flatMap((sandboxClient) =>
        send(sandboxClient).pipe(Effect.mapError(toSandboxError), Effect.provide(FetchHttpClient.layer)),
      ),
    );

  // A job is its id: every call re-resolves the client, so a handle stays usable across invocations.
  const job = (spaceId: string, sandboxId: string, jobId: string): SandboxService.Job => ({
    id: jobId,
    output: (from) =>
      Stream.unwrap(
        Effect.try({ try: () => createSandboxClient(resolve()), catch: toSandboxError }).pipe(
          Effect.map((sandboxClient) => sandboxClient.processOutput(spaceId, sandboxId, jobId, from)),
        ),
      ).pipe(
        Stream.map((event): SandboxService.JobEvent =>
          event.type === 'exit' ? { type: 'exit', exitCode: event.exitCode, success: event.success } : event,
        ),
        Stream.mapError(toSandboxError),
        Stream.provide(FetchHttpClient.layer),
      ),
    write: (data) => request((sandboxClient) => sandboxClient.writeStdin(spaceId, sandboxId, jobId, data)),
    state: () =>
      request((sandboxClient) => sandboxClient.processState(spaceId, sandboxId, jobId)).pipe(Effect.map(toJobState)),
    terminate: (signal) =>
      request((sandboxClient) => sandboxClient.killProcess(spaceId, sandboxId, jobId, signal)).pipe(
        Effect.map(toJobState),
      ),
  });

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
    exposePort: (spaceId, sandboxId, port, options) =>
      request((sandboxClient) => sandboxClient.exposePort(spaceId, sandboxId, port, options)),
    setRepositories: (spaceId, sandboxId, repositories) =>
      request((sandboxClient) => sandboxClient.setRepositories(spaceId, sandboxId, repositories)),
    startJob: (spaceId, sandboxId, { command, ...options }) =>
      request((sandboxClient) =>
        sandboxClient.startProcess(spaceId, sandboxId, { command: encodeExecCommand(command), ...options }),
      ).pipe(Effect.map((jobId) => job(spaceId, sandboxId, jobId))),
    job: (spaceId, sandboxId, jobId) => job(spaceId, sandboxId, jobId),
  };
};

const toJobState = ({ status, exitCode }: ProcessState): SandboxService.JobState => ({
  status,
  ...(exitCode !== undefined && { exitCode }),
});

const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
