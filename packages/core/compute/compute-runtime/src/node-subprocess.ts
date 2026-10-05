//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type ChildProcess, spawn as spawnChild } from 'node:child_process';
import { type Readable } from 'node:stream';

import * as Subprocess from '@dxos/compute/Subprocess';
import { log } from '@dxos/log';

/** How long a child has to exit after SIGTERM before it is sent SIGKILL. */
const KILL_GRACE = '5 seconds';

/** {@link Subprocess.Subprocess} on Node.js, over `node:child_process`. */
export const layer: Layer.Layer<Subprocess.Subprocess> = Layer.succeed(Subprocess.Subprocess, {
  spawn: (options) =>
    Effect.acquireRelease(start(options), (child) => child.kill).pipe(
      Effect.withSpan('Subprocess.spawn', { attributes: { command: options.command } }),
    ),
});

const start = (options: Subprocess.SpawnOptions): Effect.Effect<Subprocess.Child, Subprocess.SubprocessError> =>
  Effect.callback<Subprocess.Child, Subprocess.SubprocessError>((resume) => {
    const child = spawnChild(options.command, [...(options.args ?? [])], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // A missing executable is reported by an `error` event after `spawn` returns, not by a throw.
    const onError = (error: Error) =>
      resume(
        Effect.fail(
          new Subprocess.SubprocessError({
            message: error.message,
            cause: error,
            context: { command: options.command },
          }),
        ),
      );
    child.once('error', onError);
    child.once('spawn', () => {
      child.off('error', onError);
      resume(Effect.succeed(wrap(child)));
    });
  });

const wrap = (child: ChildProcess): Subprocess.Child => {
  // EPIPE from a child that exited mid-write already rejects that write; unlistened, it would crash the host.
  child.stdin?.on('error', (error) => log('subprocess stdin closed', { pid: child.pid, error: error.message }));
  const exit = new Promise<number | null>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(child.exitCode);
    } else {
      child.once('exit', (code) => resolve(code));
    }
  });
  return {
    pid: child.pid,
    stdin: new WritableStream<Uint8Array>({
      write: (chunk) =>
        new Promise<void>((resolve, reject) =>
          child.stdin?.write(chunk, (error) => (error ? reject(error) : resolve())),
        ),
      close: () => {
        child.stdin?.end();
      },
      abort: () => {
        child.stdin?.destroy();
      },
    }),
    stdout: readable(child.stdout),
    stderr: readable(child.stderr),
    exited: Effect.promise(() => exit),
    kill: Effect.suspend(() => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return Effect.void;
      }
      child.kill();
      // A child that ignores SIGTERM would otherwise hold the closing scope open indefinitely.
      return Effect.promise(() => exit).pipe(
        Effect.timeout(KILL_GRACE),
        Effect.catch(() => Effect.sync(() => child.kill('SIGKILL')).pipe(Effect.andThen(Effect.promise(() => exit)))),
        Effect.asVoid,
      );
    }),
  };
};

const readable = (stream: Readable | null): ReadableStream<Uint8Array> => {
  // A reader that cancelled has already closed the controller, so later events must not touch it.
  let open = true;
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      if (!stream) {
        controller.close();
        return;
      }
      stream.on('data', (chunk: Buffer) => {
        if (open) {
          controller.enqueue(new Uint8Array(chunk));
        }
      });
      stream.once('end', () => {
        if (open) {
          open = false;
          controller.close();
        }
      });
      stream.once('error', (error) => {
        if (open) {
          open = false;
          controller.error(error);
        }
      });
    },
    cancel: () => {
      open = false;
      stream?.destroy();
    },
  });
};
