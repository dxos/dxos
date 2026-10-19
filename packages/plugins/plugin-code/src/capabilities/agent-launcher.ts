//
// Copyright 2026 DXOS.org
//

import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import type { Child } from '@tauri-apps/plugin-shell';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import * as McpRelay from '../agents/McpRelay.ts';
import * as Protocol from '../agents/Protocol.ts';
import { AgentError } from '../errors.ts';
import * as CodeCapabilities from '../types/CodeCapabilities.ts';

/** How long the helper may take to report its port before the start counts as failed. */
const START_TIMEOUT_MS = 15_000;

/** Under the app's data folder: where delegated chats get their git worktrees. */
const WORKTREES_DIR = 'agent-worktrees';

/**
 * Session storage key for the pid of the helper this window started. The app owns the process, so a reload of
 * the page leaves it running; the next start stops it rather than leaving one behind per reload.
 */
const HELPER_PID_KEY = 'org.dxos.plugin.code.agent-helper.pid';

const HelperRefusal = Schema.Struct({ error: Schema.String });

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
      const [shell, { appDataDir, join }] = await Promise.all([
        import('@tauri-apps/plugin-shell'),
        import('@tauri-apps/api/path'),
      ]);
      // The shell plugin kills only processes it started itself, so a pid that outlived the app is never touched.
      const stale = readPid();
      if (stale !== undefined) {
        await new shell.Child(stale)
          .kill()
          .catch((error) => log.warn('could not stop the earlier dx-agent', { pid: stale, error }));
        writePid(undefined);
      }

      const token = randomToken();
      const command = shell.Command.create('dx-agent', [], {
        env: { DX_AGENT_WORKTREES: await join(await appDataDir(), WORKTREES_DIR) },
      });
      let pid: number | undefined;
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
          // A pid the plugin no longer holds can be handed to another of its processes.
          if (pid !== undefined && readPid() === pid) {
            writePid(undefined);
          }
          reject(new Error(`dx-agent exited before it was ready (code ${code}, signal ${signal})`));
          if (!stopping) {
            log.warn('dx-agent exited', { code, signal });
          }
        });
        command.on('error', (error) => reject(new Error(`dx-agent failed: ${error}`)));
      });
      command.stderr.on('data', (data) => log.info('dx-agent', { output: data }));

      const child = await command.spawn();
      pid = child.pid;
      writePid(pid);
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
        writePid(undefined);
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

    /** One request to the helper, its JSON answer decoded with `schema`. */
    const call = <A>(label: string, path: string, schema: Schema.Codec<A>, init: RequestInit = {}) =>
      helper.pipe(
        Effect.flatMap(({ port, token }) =>
          Effect.tryPromise({
            try: async () => {
              const response = await fetch(`http://localhost:${port}${path}`, {
                ...init,
                headers: {
                  authorization: `Bearer ${token}`,
                  ...(init.body !== undefined && { 'content-type': 'application/json' }),
                },
              });
              const body: unknown = await response.json();
              if (!response.ok) {
                const refusal = Schema.decodeUnknownOption(HelperRefusal)(body);
                throw new Error(
                  Option.isSome(refusal) ? refusal.value.error : `agent helper answered ${response.status}`,
                );
              }
              return Schema.decodeUnknownSync(schema)(body);
            },
            catch: (cause) =>
              new AgentError({
                message: `${label}: ${cause instanceof Error ? cause.message : String(cause)}`,
                cause,
              }),
          }),
        ),
      );

    const agents = call('could not list coding agents', Protocol.AGENTS_PATH, Schema.Array(Protocol.AgentStatus));

    const worktrees: CodeCapabilities.AgentHelper['worktrees'] = {
      ensure: (request) =>
        call('could not prepare a worktree', Protocol.WORKTREES_PATH, Protocol.Worktree, {
          method: 'POST',
          body: JSON.stringify(request),
        }),
      remove: (key) =>
        call(
          'could not remove a worktree',
          `${Protocol.WORKTREES_PATH}?${new URLSearchParams({ key })}`,
          Schema.Struct({ outcome: Protocol.WorktreeOutcome }),
          { method: 'DELETE' },
        ).pipe(Effect.map(({ outcome }) => outcome)),
      list: call('could not list worktrees', Protocol.WORKTREES_PATH, Schema.Array(Protocol.Worktree)),
    };

    // The page's one connection for MCP: the helper relays every agent's requests over it.
    const relay = new McpRelay.Relay(() =>
      EffectEx.runPromise(helper).then(({ port, token }) => ({
        url: `ws://localhost:${port}${Protocol.MCP_HOST_PATH}`,
        token,
      })),
    );
    const mcp: CodeCapabilities.AgentHelper['mcp'] = {
      serve: (server, handle, token) =>
        helper.pipe(
          Effect.flatMap(({ port }) =>
            Effect.tryPromise({
              try: () => relay.serve(server, handle, token),
              catch: (cause) => new AgentError({ message: 'could not serve Composer tools to the agent', cause }),
            }).pipe(Effect.as({ url: `http://localhost:${port}${Protocol.MCP_PATH}/${server}` })),
          ),
        ),
      close: (server) => Effect.promise(() => relay.close(server)),
    };

    const connect = (agent: string, cwd: string, mcpToken?: string) =>
      helper.pipe(
        Effect.map(({ port, token }) =>
          createWebSocketStream(Protocol.acpUrl({ port, agent, cwd, mcpToken }), {
            protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)],
          }),
        ),
      );

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        stopping = true;
        const running = await current?.catch(() => undefined);
        await running?.child.kill().catch((error) => log.warn('dx-agent kill failed', { error }));
        writePid(undefined);
      }),
    );

    return Capability.contribute(CodeCapabilities.AgentHelper, { agents, connect, worktrees, mcp });
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

const readPid = (): number | undefined => {
  try {
    const pid = Number(sessionStorage.getItem(HELPER_PID_KEY));
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch (error) {
    log.warn('could not read the earlier dx-agent pid', { error });
    return undefined;
  }
};

const writePid = (pid: number | undefined): void => {
  try {
    if (pid === undefined) {
      sessionStorage.removeItem(HELPER_PID_KEY);
    } else {
      sessionStorage.setItem(HELPER_PID_KEY, String(pid));
    }
  } catch (error) {
    log.warn('could not record the dx-agent pid', { error });
  }
};

/** 256 random bits as hex: what the helper checks every request against. */
const randomToken = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
