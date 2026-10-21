//
// Copyright 2026 DXOS.org
//

import type { Child } from '@tauri-apps/plugin-shell';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import * as HelperClient from '../agents/HelperClient.ts';
import { AGENT_KEY_PREFIX } from '../constants.ts';
import * as ClaudeCapabilities from '../types/ClaudeCapabilities.ts';

/** How long the helper may take to report its port before the start counts as failed. */
const START_TIMEOUT_MS = 15_000;

/** Under the app's data folder: where delegated chats get their git worktrees. */
const WORKTREES_DIR = 'agent-worktrees';

/**
 * Session storage key for the pid of the helper this window started. The app owns the process, so a reload of
 * the page leaves it running; the next start stops it rather than leaving one behind per reload.
 */
const HELPER_PID_KEY = `${AGENT_KEY_PREFIX}.agent-helper.pid`;

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
    let child: Child | undefined;
    let stopping = false;

    const client = HelperClient.make(async () => {
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
          client.reset();
          child = undefined;
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

      const spawned = await command.spawn();
      child = spawned;
      pid = spawned.pid;
      writePid(pid);
      try {
        await spawned.write(`${token}\n`);
        const ready = await Promise.race([
          port,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('dx-agent did not report a port in time')), START_TIMEOUT_MS),
          ),
        ]);
        log.info('dx-agent running', { pid: spawned.pid, port: ready });
        return { port: ready, token };
      } catch (error) {
        await spawned.kill().catch((killError) => log.warn('dx-agent kill failed', { error: killError }));
        writePid(undefined);
        throw error;
      }
    });

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        stopping = true;
        await client.current()?.catch(() => undefined);
        await child?.kill().catch((error) => log.warn('dx-agent kill failed', { error }));
        writePid(undefined);
      }),
    );

    return Capability.contribute(ClaudeCapabilities.AgentHelper, client.helper);
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
