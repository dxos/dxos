//
// Copyright 2026 DXOS.org
//

import type { Child } from '@tauri-apps/plugin-shell';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import * as HttpBackend from '../services/HttpBackend.ts';
import * as SandboxCapabilities from '../types/SandboxCapabilities.ts';
import * as SandboxService from '../types/SandboxService.ts';

/** How long the helper may take to report its port before the start counts as failed. */
const START_TIMEOUT_MS = 15_000;

type Helper = { child: Child; backend: SandboxService.Backend };

/**
 * Runs local sandboxes for the desktop app's webview through `dx-sandbox` (`local/sidecar.ts`),
 * which serves them on a loopback port. Spawned as a scoped shell command like plugin-native's
 * Ollama, and for the same reason: an `externalBin` sidecar inherits the app's passkey entitlements
 * and macOS kills it at exec.
 *
 * The helper starts on first use and again after it dies. Its token is written to stdin, not passed
 * as an argument, since any user on the machine can read another process's arguments. Outside the
 * desktop app the launcher only reports that local sandboxes need it.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    let current: Promise<Helper> | undefined;
    let stopping = false;

    const start = async (): Promise<Helper> => {
      if (!isTauri()) {
        throw new Error('local sandboxes need the desktop app');
      }
      const { Command } = await import('@tauri-apps/plugin-shell');
      const token = randomToken();
      const command = Command.create('dx-sandbox', []);
      const port = new Promise<number>((resolve, reject) => {
        let reported = false;
        // Each event is one line, but whether it keeps its terminator is not part of the shell plugin's contract.
        command.stdout.on('data', (line) => {
          if (reported) {
            return;
          }
          reported = true;
          // Parsed here, in an event handler: a throw would escape it and leave startup waiting out the timeout.
          try {
            resolve(parseReadyLine(line));
          } catch (error) {
            reject(error);
          }
        });
        command.on('close', ({ code, signal }) => {
          current = undefined;
          reject(new Error(`dx-sandbox exited before it was ready (code ${code}, signal ${signal})`));
          if (!stopping) {
            log.warn('dx-sandbox exited', { code, signal });
          }
        });
        command.on('error', (error) => reject(new Error(`dx-sandbox failed: ${error}`)));
      });
      command.stderr.on('data', (data) => log.info('dx-sandbox', { output: data }));

      const child = await command.spawn();
      try {
        await child.write(`${token}\n`);
        const ready = await Promise.race([
          port,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('dx-sandbox did not report a port in time')), START_TIMEOUT_MS),
          ),
        ]);
        log.info('dx-sandbox running', { pid: child.pid, port: ready });
        return { child, backend: HttpBackend.make(`http://127.0.0.1:${ready}`, token) };
      } catch (error) {
        await child.kill().catch(() => {});
        throw error;
      }
    };

    const backend = Effect.tryPromise({
      try: () =>
        (current ??= start().catch((error) => {
          current = undefined;
          throw error;
        })),
      catch: (cause) =>
        new SandboxService.SandboxError({
          message: `could not start the local sandbox helper: ${cause instanceof Error ? cause.message : String(cause)}`,
          cause,
        }),
    }).pipe(Effect.map((helper) => helper.backend));

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        stopping = true;
        const helper = await current?.catch(() => undefined);
        await helper?.child.kill().catch(() => {});
      }),
    );

    return Capability.contribute(SandboxCapabilities.LocalLauncher, { backend });
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
  throw new Error(`unexpected first line from dx-sandbox: ${line.trim()}`);
};

/** 256 random bits as hex: what the helper checks every request against. */
const randomToken = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
