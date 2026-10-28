//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { devNull } from 'node:os';
import { createInterface } from 'node:readline';

import { log } from '@dxos/log';

// Raw promises throughout: this module is the node platform boundary (a child process and its stdio streams), and
// the dev-server middleware that calls it is promise-based too.

export type McpClientOptions = {
  /** The command and arguments that serve MCP on stdio. */
  command: string;
  args: readonly string[];
  cwd: string;
  /** Wall-clock budget for one call. */
  timeout?: number;
};

export type McpClient = {
  /** Calls one tool and returns its structured result; starts the server on first use and after it exits. */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  close: () => void;
};

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

type JsonRpcResponse = { id?: number; result?: unknown; error?: { message?: string } };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** A tool result's payload: its structured content when the server sends it, else its text parsed as JSON. */
export const payloadOf = (result: unknown, tool: string): unknown => {
  if (!isRecord(result)) {
    return result;
  }
  const text = Array.isArray(result.content)
    ? result.content.flatMap((part) => (isRecord(part) && typeof part.text === 'string' ? [part.text] : [])).join('\n')
    : undefined;
  if (result.isError === true) {
    throw new Error(`code-index tool "${tool}" failed: ${text || 'no message'}`);
  }
  if (result.structuredContent !== undefined) {
    return result.structuredContent;
  }
  if (text === undefined) {
    return result;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Keeps the last lines a server wrote to stderr, which say why it failed to start (a locked or missing store). */
const STDERR_LINES = 20;

/** Enough for the three stdio pipes, both ends each. */
const RESERVED_FDS = 8;

/**
 * Holds low-numbered descriptors for the child's stdio pipes. macOS's `posix_spawn` refuses descriptors at or above
 * `OPEN_MAX` (10240), and by the first request a dev server watching the monorepo holds every number below that, so
 * the pipes are numbered from slots taken while the table was still small and released just before the spawn.
 */
const reserveDescriptors = () => {
  const take = () => Array.from({ length: RESERVED_FDS }, () => openSync(devNull, 'r'));
  const release = (fds: number[]) => fds.forEach((fd) => closeSync(fd));
  let fds = take();
  return {
    /** Runs `spawn` with the reserved slots free, then takes the lowest free slots again for the next spawn. */
    around: <T>(spawn: () => T): T => {
      release(fds);
      fds = [];
      try {
        return spawn();
      } finally {
        fds = take();
      }
    },
    close: () => {
      release(fds);
      fds = [];
    },
  };
};

/**
 * A minimal MCP client over stdio: newline-delimited JSON-RPC, `initialize` once, then `tools/call`. Just enough for
 * `code-index mcp`, so the dev server needs neither the MCP SDK nor the index's native addon in its own process.
 */
export const make = ({ command, args, cwd, timeout = 60_000 }: McpClientOptions): McpClient => {
  let child: ChildProcessWithoutNullStreams | undefined;
  let ready: Promise<void> | undefined;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  const stderr: string[] = [];
  const descriptors = reserveDescriptors();

  const failAll = (error: Error) => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };

  const send = (message: Record<string, unknown>) => child?.stdin.write(`${JSON.stringify(message)}\n`);

  const request = (method: string, params: Record<string, unknown>): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`code-index did not answer ${method} within ${timeout}ms`));
      }, timeout);
      pending.set(id, { resolve, reject, timer });
      send({ jsonrpc: '2.0', id, method, params });
    });

  const start = (): Promise<void> => {
    stderr.length = 0;
    const process = descriptors.around(() => spawn(command, [...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] }));
    child = process;
    // A write racing the child's death fails with EPIPE; unheard, it would throw in the dev server, and the exit
    // handler already fails the pending calls.
    process.stdin.on('error', () => {});
    createInterface({ input: process.stdout }).on('line', (line) => {
      let message: JsonRpcResponse;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      const entry = message.id === undefined ? undefined : pending.get(message.id);
      if (!entry || message.id === undefined) {
        return;
      }
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new Error(message.error.message ?? 'MCP error'));
      } else {
        entry.resolve(message.result);
      }
    });
    createInterface({ input: process.stderr }).on('line', (line) => {
      stderr.push(line);
      if (stderr.length > STDERR_LINES) {
        stderr.shift();
      }
    });
    const exited = (reason: string) => {
      // A child replaced after a failed start or a close exits late; its requests are already settled.
      if (child !== process) {
        return;
      }
      child = undefined;
      ready = undefined;
      failAll(new Error([`code-index mcp ${reason}`, ...stderr].join('\n')));
    };
    process.on('error', (error) => exited(`could not start: ${error.message}`));
    process.on('exit', (code, signal) => exited(`exited (${signal ?? code})`));

    return request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: '@dxos/plugin-code-graph', version: '0.0.0' },
    }).then(() => {
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      log.info('code-index mcp ready', { cwd });
    });
  };

  return {
    callTool: async (name, args) => {
      ready ??= start().catch((error) => {
        // A child that did not finish starting may still hold the store's lock, so it goes before a retry spawns another.
        const failed = child;
        child = undefined;
        ready = undefined;
        failed?.kill();
        throw error;
      });
      await ready;
      return payloadOf(await request('tools/call', { name, arguments: args }), name);
    },
    close: () => {
      failAll(new Error('code-index client closed'));
      descriptors.close();
      child?.kill();
      child = undefined;
      ready = undefined;
    },
  };
};
