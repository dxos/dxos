//
// Copyright 2026 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { log } from '@dxos/log';

import { type Shell } from '#shell';

// Raw promises: like the shell route, this is the node platform boundary inside a dev-server request handler.

/** One script for the runner to execute; every field is already validated and resolved by the route. */
export type RunRequest = {
  script: string;
  stdin?: string;
  cwd: string;
  shell: string;
  timeout: number;
  maxOutputChars: number;
  /** Variables added to the runner's own environment for this script. */
  env: Record<string, string>;
};

/** A runner process that executes scripts on behalf of the dev server. */
export type ExecRunner = {
  /** Starts the runner now, while this process can still spawn; otherwise the first request starts it. */
  prepare: () => void;
  run: (request: RunRequest) => Promise<Shell.Result>;
  close: () => Promise<void>;
};

type Reply = { id: number; result?: Shell.Result; error?: string };

type Runner = {
  process: ChildProcessWithoutNullStreams;
  pending: Map<number, { resolve: (result: Shell.Result) => void; reject: (error: Error) => void }>;
};

/**
 * Reads one JSON request per line from stdin and writes one JSON reply per line to stdout; exits when stdin closes.
 *
 * Each script's child gets its own process group (`detached`) so a timeout can kill everything it started rather than
 * only the shell - a backgrounded build would otherwise outlive the request that spawned it and keep writing to a dead
 * pipe. The program is dependency-free so it runs from source and from a build alike.
 */
const RUNNER_PROGRAM = `
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const reply = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
// The dev server may go away mid-reply; an unhandled EPIPE would only crash a runner that is about to exit anyway.
process.stdout.on('error', () => {});

const run = ({ script, stdin, cwd, shell, timeout, maxOutputChars, env }) =>
  new Promise((resolve) => {
    const started = Date.now();
    let truncated = false;
    const collect = () => {
      let text = '';
      return {
        get: () => text,
        append: (chunk) => {
          const room = maxOutputChars - text.length;
          if (room <= 0) {
            truncated = true;
            return;
          }
          if (chunk.length > room) {
            truncated = true;
          }
          text += chunk.slice(0, room);
        },
      };
    };
    const stdout = collect();
    const stderr = collect();

    let child;
    try {
      child = spawn(shell, ['-c', script], {
        cwd,
        detached: true,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      stderr.append(String(error));
      resolve({ stdout: '', stderr: stderr.get(), exitCode: null, timedOut: false, truncated, cwd, durationMs: 0 });
      return;
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', stdout.append);
    child.stderr.on('data', stderr.append);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid === undefined) {
        return;
      }
      try {
        // Negative pid: the group, not just the shell.
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        process.stderr.write('failed to kill script: ' + String(error) + '\\n');
      }
    }, timeout);

    // A script that never reads stdin closes the pipe under us; unhandled, that EPIPE would end the runner.
    child.stdin.on('error', () => {});
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    let done = false;
    const finish = (exitCode, signal) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve({
        stdout: stdout.get(),
        stderr: stderr.get(),
        exitCode,
        signal: signal ?? undefined,
        timedOut,
        truncated,
        cwd,
        durationMs: Date.now() - started,
      });
    };
    child.on('close', finish);
    child.on('error', (error) => {
      stderr.append(String(error));
      finish(null, null);
    });
  });

createInterface({ input: process.stdin }).on('line', (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    process.stderr.write('unparseable runner request: ' + String(error) + '\\n');
    return;
  }
  run(request).then(
    (result) => reply({ id: request.id, result }),
    (error) => reply({ id: request.id, error: String(error) }),
  );
});
`;

/**
 * Executes the shell route's scripts in a Node process of its own, started by `prepare` while the dev server is young:
 * on macOS `posix_spawn` refuses descriptors at or above `OPEN_MAX` (10240), and a dev server watching the monorepo
 * holds more than that, so nothing it spawns later starts (`spawn EBADF`).
 *
 * A runner that dies is started again on the next request, which works only while this process can still spawn.
 */
export const make = (): ExecRunner => {
  let current: Runner | undefined;
  let nextId = 0;

  const start = (): Runner => {
    let spawned: ChildProcessWithoutNullStreams;
    try {
      spawned = spawn(process.execPath, ['--input-type=module', '-e', RUNNER_PROGRAM], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      throw new Error(`the dev server can no longer start processes (${String(error)}); restart it`);
    }

    // Pending requests belong to the process they were sent to, so a runner replaced after `close` fails only its own.
    const runner: Runner = { process: spawned, pending: new Map() };
    const stop = (error: Error) => {
      if (current === runner) {
        current = undefined;
      }
      for (const { reject } of runner.pending.values()) {
        reject(error);
      }
      runner.pending.clear();
    };

    createInterface({ input: spawned.stdout }).on('line', (line) => {
      let reply: Reply;
      try {
        reply = JSON.parse(line);
      } catch (error) {
        log.warn('unparseable reply from the exec runner', { error: String(error) });
        return;
      }
      const request = runner.pending.get(reply.id);
      runner.pending.delete(reply.id);
      if (reply.result) {
        request?.resolve(reply.result);
      } else {
        request?.reject(new Error(reply.error ?? 'the exec runner returned no result'));
      }
    });
    spawned.stderr.on('data', (chunk) => log.info('exec runner', { output: String(chunk).trim() }));
    spawned.stdin.on('error', (error) => log.warn('exec runner input failed', { error: String(error) }));
    spawned.on('error', (error) => stop(new Error(`the exec runner failed: ${String(error)}`)));
    spawned.on('exit', (code, signal) => stop(new Error(`the exec runner exited (code ${code}, signal ${signal})`)));
    log.debug('exec runner started', { pid: spawned.pid });
    return runner;
  };

  const ensure = (): Runner => (current ??= start());

  const prepare = (): void => {
    try {
      ensure();
    } catch (error) {
      log.warn('exec runner failed to start', { error: String(error) });
    }
  };

  const run = (request: RunRequest): Promise<Shell.Result> =>
    new Promise<Shell.Result>((resolve, reject) => {
      let runner: Runner;
      try {
        runner = ensure();
      } catch (error) {
        reject(error);
        return;
      }
      const id = nextId++;
      runner.pending.set(id, { resolve, reject });
      runner.process.stdin.write(`${JSON.stringify({ ...request, id })}\n`);
    });

  const close = async (): Promise<void> => {
    // The runner stops reading when its input ends and exits once its scripts finish, so it never outlives this.
    current?.process.stdin.end();
    current = undefined;
  };

  return { prepare, run, close };
};
