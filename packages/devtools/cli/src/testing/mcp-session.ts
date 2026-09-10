//
// Copyright 2026 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';

import { dxBin } from './run-dx';

/**
 * A live `dx mcp serve` stdio session the caller keeps open across several calls.
 *
 * `runDx` cannot serve here: `spawnSync` closes stdin as soon as its input is written and the
 * server exits with the stream, so a scaffold needing three ordered calls would need three
 * servers — each paying the client boot again, and the second racing the first one's shutdown
 * over the same data directory.
 */
export type McpSessionOptions = {
  /** Data root for the client the server boots; every session in a test wants its own. */
  home: string;
  /** Ceiling for one request, in ms. Booting the client makes the first call much slower. */
  timeout?: number;
};

type Message = { id?: number; result?: any; error?: { message?: string } };

const DEFAULT_TIMEOUT = 120_000;

/** How long a graceful shutdown gets before the process is killed outright. */
const SHUTDOWN_GRACE = 30_000;

/** A tool call answers with content blocks; the structured payload is JSON in the first one. */
type ToolResult = { content?: { text?: string }[]; structuredContent?: unknown; isError?: boolean };

export class McpSession {
  #child: ChildProcessWithoutNullStreams;
  #pending = new Map<number, { resolve: (message: Message) => void; reject: (error: Error) => void }>();
  #buffer = '';
  #nextId = 1;
  #timeout: number;
  #stderr = '';
  #exited?: Error;

  private constructor(child: ChildProcessWithoutNullStreams, timeout: number) {
    this.#child = child;
    this.#timeout = timeout;

    this.#child.stdout.on('data', (chunk) => this.#consume(String(chunk)));
    this.#child.stderr.on('data', (chunk) => {
      this.#stderr += String(chunk);
    });
    // A server that dies mid-scaffold would otherwise surface as every later call timing out,
    // which reads as a slow machine rather than the crash it is.
    this.#child.on('exit', (code, signal) => this.#fail(`dx mcp serve exited (code=${code}, signal=${signal})`));
    // Without this a missing binary (ENOENT) is an uncaught exception that takes the worker down.
    this.#child.on('error', (error) => this.#fail(`dx mcp serve failed to start: ${error.message}`));
    this.#child.stdin.on('error', (error) => this.#fail(`dx mcp serve stdin: ${error.message}`));
  }

  static async open({ home, timeout = DEFAULT_TIMEOUT }: McpSessionOptions): Promise<McpSession> {
    const child = spawn(dxBin, ['mcp', 'serve'], {
      env: {
        ...process.env,
        HOME: home,
        PROTO_HOME: process.env.PROTO_HOME ?? `${process.env.HOME ?? ''}/.proto`,
        DX_DEBUG: 'error',
        NO_COLOR: '1',
        PROTO_REPORTER: 'text',
      },
      // Its own group, so `close` can take down anything the server spawns rather than orphaning
      // it against the data directory the caller is about to delete.
      detached: true,
    });

    const session = new McpSession(child, timeout);
    try {
      await session.#request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'dx-agent-e2e', version: '1' },
      });
    } catch (error) {
      // The caller never receives a handle when this throws, so nothing else can stop the server.
      await session.close();
      throw error;
    }
    session.#notify('notifications/initialized');
    return session;
  }

  /**
   * Invokes one operation by key through the surface's dispatcher and returns its output.
   *
   * `spaceId` is a sibling of `input`, not a field inside it: the projection resolves the target
   * space before the operation's own schema is applied, and an operation acting on a space fails
   * with "it needs one named" when the id is buried in the payload.
   */
  async invoke(key: string, input: Record<string, unknown> = {}, spaceId?: string): Promise<any> {
    const result: ToolResult = await this.#call('invokeOperation', {
      key,
      input,
      ...(spaceId ? { spaceId } : {}),
    });
    if (result.isError) {
      throw new Error(`operation ${key} failed: ${JSON.stringify(result.content)}`);
    }
    const text = result.content?.[0]?.text;
    return text === undefined ? result.structuredContent : JSON.parse(text);
  }

  /**
   * Shuts the server down and waits for it to go.
   *
   * SIGTERM, not SIGKILL: nothing on the invoke path flushes, so the client's own shutdown is
   * what gets the scaffold to disk — killed outright, the next reader can find an empty database
   * and the failure looks like a broken fixture. SIGKILL is only the backstop for a server that
   * will not leave.
   */
  async close(): Promise<void> {
    // A process that never spawned emits no `exit`, so awaiting one here would hang cleanup.
    if (this.#child.pid === undefined || this.#child.exitCode !== null || this.#child.signalCode !== null) {
      return;
    }
    const exited = new Promise<void>((resolve) => this.#child.once('exit', () => resolve()));
    this.#signal('SIGTERM');
    const timer = setTimeout(() => this.#signal('SIGKILL'), SHUTDOWN_GRACE);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Signals the whole group, so a child the server spawned goes with it. */
  #signal(signal: NodeJS.Signals): void {
    try {
      process.kill(-(this.#child.pid ?? 0), signal);
    } catch {
      // Already gone, or never had a group; the direct signal below is the fallback.
      this.#child.kill(signal);
    }
  }

  #fail(message: string): void {
    this.#exited ??= new Error(`${message}: ${this.#stderr.slice(-2000)}`);
    for (const { reject } of this.#pending.values()) {
      reject(this.#exited);
    }
    this.#pending.clear();
  }

  async #call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const message = await this.#request('tools/call', { name, arguments: args });
    return message.result as ToolResult;
  }

  #request(method: string, params: Record<string, unknown>): Promise<Message> {
    if (this.#exited) {
      return Promise.reject(this.#exited);
    }
    const id = this.#nextId++;
    return new Promise<Message>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`timed out after ${this.#timeout}ms awaiting ${method}`));
      }, this.#timeout);
      this.#pending.set(id, {
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.#child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  #notify(method: string): void {
    this.#child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method })}\n`);
  }

  #consume(chunk: string): void {
    this.#buffer += chunk;
    const lines = this.#buffer.split('\n');
    this.#buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }
      let message: Message;
      try {
        message = JSON.parse(line);
      } catch {
        // The transport is line-delimited JSON; anything else on stdout is log noise.
        continue;
      }
      if (message.id === undefined) {
        continue;
      }
      const pending = this.#pending.get(message.id);
      if (!pending) {
        continue;
      }
      this.#pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? 'MCP error'));
      } else {
        pending.resolve(message);
      }
    }
  }
}
