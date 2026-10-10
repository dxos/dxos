//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type ChildProcess, spawn as spawnChild } from 'node:child_process';
import { type Readable } from 'node:stream';

import * as ShellService from '@dxos/compute/ShellService';
import { log } from '@dxos/log';

/** How long a child has to exit after SIGTERM before it is sent SIGKILL. */
const KILL_GRACE = '5 seconds';

/**
 * {@link ShellService.ShellService} on Node.js, over `node:child_process`. Every child still running
 * when the layer is torn down (its compute process ended) is killed, whatever scope its caller used.
 */
export const layer: Layer.Layer<ShellService.ShellService> = Layer.effect(
  ShellService.ShellService,
  Effect.gen(function* () {
    const running = new Set<ShellService.Child>();
    yield* Effect.addFinalizer(() =>
      Effect.forEach(running, (child) => child.kill, { concurrency: 'unbounded', discard: true }),
    );

    const spawn = (options: ShellService.SpawnOptions) =>
      Effect.acquireRelease(
        start(options).pipe(Effect.tap((child) => Effect.sync(() => running.add(child)))),
        (child) => child.kill.pipe(Effect.ensuring(Effect.sync(() => running.delete(child)))),
      ).pipe(Effect.withSpan('ShellService.spawn', { attributes: { command: options.command } }));

    return {
      spawn,
      exec: ({ script, ...options }) =>
        Effect.scoped(
          Effect.gen(function* () {
            const child = yield* spawn({ ...options, command: 'bash', args: ['-c', script] });
            yield* Effect.promise(() => child.stdin.close());
            const [stdout, stderr, exitCode] = yield* Effect.all(
              [text(child.stdout), text(child.stderr), child.exited],
              { concurrency: 'unbounded' },
            );
            return { exitCode, stdout, stderr };
          }),
        ),
    };
  }),
);

const start = (options: ShellService.SpawnOptions): Effect.Effect<ShellService.Child, ShellService.ShellError> =>
  Effect.callback<ShellService.Child, ShellService.ShellError>((resume) => {
    const child = spawnChild(options.command, [...(options.args ?? [])], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Stays for the child's lifetime: an `error` with no listener (say, after startup was interrupted) crashes the host.
    child.on('error', (error) => log('shell child error', { command: options.command, error: error.message }));
    // A missing executable is reported by an `error` event after `spawn` returns, not by a throw.
    const onError = (error: Error) =>
      resume(
        Effect.fail(
          new ShellService.ShellError({
            message: error.message,
            cause: error,
            context: { command: options.command },
          }),
        ),
      );
    const onSpawn = () => {
      child.off('error', onError);
      resume(Effect.succeed(wrap(child)));
    };
    child.once('error', onError);
    child.once('spawn', onSpawn);
    // Interrupted before `spawn` fired, the release below was never registered, so the child is killed here.
    return Effect.sync(() => {
      child.off('error', onError);
      child.off('spawn', onSpawn);
      child.kill();
    });
  });

const wrap = (child: ChildProcess): ShellService.Child => {
  // EPIPE from a child that exited mid-write already rejects that write; unlistened, it would crash the host.
  child.stdin?.on('error', (error) => log('shell child stdin closed', { pid: child.pid, error: error.message }));
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

const text = (stream: ReadableStream<Uint8Array>): Effect.Effect<string> =>
  Effect.promise(() => new Response(stream).text());
