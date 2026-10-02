//
// Copyright 2026 DXOS.org
//

import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import type { Child } from '@tauri-apps/plugin-shell';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import * as Protocol from '../agents/Protocol.ts';
import { AgentError } from '../errors.ts';
import * as CodeCapabilities from '../types/CodeCapabilities.ts';

/** How long the helper may take to report its port before the start counts as failed. */
const START_TIMEOUT_MS = 15_000;

type Helper = { child: Child; port: number; token: string };

/**
 * Runs coding agents for the desktop app's webview through `dx-agent` (`agent-helper/sidecar.ts`),
 * which launches them and relays their ACP traffic on a loopback port. Spawned as a scoped shell
 * command like the sandbox helper, and for the same reason: an `externalBin` sidecar inherits the
 * app's passkey entitlements and macOS kills it at exec.
 *
 * The helper starts on first use and again after it dies. Its token is written to stdin, not passed
 * as an argument, since any user on the machine can read another process's arguments.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    let current: Promise<Helper> | undefined;
    let stopping = false;

    const start = async (): Promise<Helper> => {
      if (!isTauri()) {
        throw new Error('coding agents need the desktop app');
      }
      const { Command } = await import('@tauri-apps/plugin-shell');
      const token = randomToken();
      const command = Command.create('dx-agent');
      const port = new Promise<number>((resolve, reject) => {
        let reported = false;
        command.stdout.on('data', (line) => {
          if (reported) {
            return;
          }
          reported = true;
          try {
            resolve(parseReadyLine(line));
          } catch (error) {
            reject(error);
          }
        });
        command.on('close', ({ code, signal }) => {
          current = undefined;
          reject(new Error(`dx-agent exited before it was ready (code ${code}, signal ${signal})`));
          if (!stopping) {
            log.warn('dx-agent exited', { code, signal });
          }
        });
        command.on('error', (error) => reject(new Error(`dx-agent failed: ${error}`)));
      });
      command.stderr.on('data', (data) => log.info('dx-agent', { output: data }));

      const child = await command.spawn();
      try {
        await child.write(`${token}\n`);
        const ready = await Promise.race([
          port,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('dx-agent did not report a port in time')), START_TIMEOUT_MS),
          ),
        ]);
        log.info('dx-agent running', { pid: child.pid, port: ready });
        return { child, port: ready, token };
      } catch (error) {
        await child.kill().catch((killError) => log.warn('dx-agent kill failed', { error: killError }));
        throw error;
      }
    };

    const helper = Effect.tryPromise({
      try: () =>
        (current ??= start().catch((error) => {
          current = undefined;
          throw error;
        })),
      catch: (cause) =>
        new AgentError({
          message: `could not start the agent helper: ${cause instanceof Error ? cause.message : String(cause)}`,
          cause,
        }),
    });

    const agents = helper.pipe(
      Effect.flatMap(({ port, token }) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(`http://localhost:${port}${Protocol.AGENTS_PATH}`, {
              headers: { authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
              throw new Error(`agent helper answered ${response.status}`);
            }
            const statuses: Protocol.AgentStatus[] = await response.json();
            return statuses;
          },
          catch: (cause) => new AgentError({ message: 'could not list coding agents', cause }),
        }),
      ),
    );

    const connect = (agent: string, cwd: string) =>
      helper.pipe(
        Effect.map(({ port, token }) =>
          createWebSocketStream(Protocol.acpUrl({ port, agent, cwd }), {
            protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)],
          }),
        ),
      );

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        stopping = true;
        const running = await current?.catch(() => undefined);
        await running?.child.kill().catch((error) => log.warn('dx-agent kill failed', { error }));
      }),
    );

    return Capability.contribute(CodeCapabilities.AgentHelper, { agents, connect });
  }),
);

/** Reads the port from the helper's first line of output, `{"port":N}`, with or without its newline. */
export const parseReadyLine = (line: string): number => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    parsed = undefined;
  }
  if (typeof parsed === 'object' && parsed !== null && 'port' in parsed && typeof parsed.port === 'number') {
    return parsed.port;
  }
  throw new Error(`unexpected first line from dx-agent: ${line.trim()}`);
};

/** 256 random bits as hex: what the helper checks every request against. */
const randomToken = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
