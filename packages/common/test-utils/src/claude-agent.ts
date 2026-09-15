//
// Copyright 2026 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

/**
 * Drives one long-lived `claude --print` process in stream-json mode: prompts go in on stdin as
 * JSONL user messages and every event comes back on stdout as JSONL, so a test can send a turn,
 * wait for it to finish, assert, and send the next one down the same conversation.
 *
 * A turn per process would work too, but each restart re-launches the MCP servers, and a server
 * still holding the data directory while the next one boots is a race the test cannot see.
 */
export type ClaudeAgentOptions = {
  /** Working directory for the agent; also the only directory its file tools may touch. */
  cwd: string;
  /** MCP servers, in the shape of an `.mcp.json` `mcpServers` map. Passed with --strict-mcp-config. */
  mcpServers: Record<string, unknown>;
  /** Anthropic credential. The caller reads it from DX_ANTHROPIC_API_KEY. */
  apiKey: string;
  /** Model alias or full name; the suite pins Sonnet. */
  model: string;
  /** Tools the agent may use without a prompt. Anything else is denied outright. */
  allowedTools: string[];
  /** Ceiling for one turn, in ms. */
  timeout?: number;
};

/** One assistant turn, reduced to what an assertion needs. */
export type Turn = {
  /** The `result` event's text, or undefined when the turn produced none. */
  result?: string;
  /** True when the CLI reported the turn as an error (including a refusal or a turn limit). */
  isError: boolean;
  /** Names of every MCP tool the agent called this turn, in order. */
  toolCalls: string[];
  /** Every event of the turn, for diagnosing a failure without re-running the model. */
  events: any[];
  /** Epoch milliseconds of the send and of the `result` event. */
  start: number;
  end: number;
};

const DEFAULT_TIMEOUT = 300_000;

export class ClaudeAgent {
  #child: ChildProcessWithoutNullStreams;
  #buffer = '';
  #events: any[] = [];
  #timeout: number;
  #stderr = '';
  #onEvent?: (event: any) => void;
  #onFail?: (error: Error) => void;
  #exited?: Error;

  private constructor(child: ChildProcessWithoutNullStreams, timeout: number) {
    this.#child = child;
    this.#timeout = timeout;
    this.#child.stdout.on('data', (chunk) => this.#consume(String(chunk)));
    this.#child.stderr.on('data', (chunk) => {
      this.#stderr += String(chunk);
    });
    // Each of these has to fail the turn in flight rather than only be recorded: a crash would
    // otherwise burn the full turn timeout and report "timed out" instead of the actual stderr.
    this.#child.on('exit', (code, signal) => this.#fail(`claude exited (code=${code}, signal=${signal})`));
    // A missing `claude` binary raises ENOENT here; unhandled, it takes the vitest worker down.
    this.#child.on('error', (error) => this.#fail(`claude failed to start: ${error.message}`));
    this.#child.stdin.on('error', (error) => this.#fail(`claude stdin: ${error.message}`));
  }

  #fail(message: string): void {
    this.#exited ??= new Error(`${message}: ${this.#stderr.slice(-2000)}`);
    const onFail = this.#onFail;
    this.#onEvent = undefined;
    this.#onFail = undefined;
    onFail?.(this.#exited);
  }

  /**
   * Spawns the agent and returns immediately; the process is live from here until {@link close}.
   *
   * Nothing is sent yet — the CLI sits waiting on stdin — so a caller can scaffold whatever the
   * first turn will act on before spending a token on it.
   */
  static start({
    cwd,
    mcpServers,
    apiKey,
    model,
    allowedTools,
    timeout = DEFAULT_TIMEOUT,
  }: ClaudeAgentOptions): ClaudeAgent {
    // Every CLAUDE_* variable is dropped: run from inside another Claude Code session they name
    // that session, and the child would resume the caller's conversation instead of starting one.
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter(([key, value]) => value !== undefined && !key.startsWith('CLAUDE_')) as [
        string,
        string,
      ][],
    );

    const child = spawn(
      'claude',
      [
        '--print',
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json',
        // Required by the CLI alongside stream-json output.
        '--verbose',
        // A repo CLAUDE.md, the developer's settings and any installed plugin would each change
        // what the agent does; without this the suite's failures are not reproducible.
        '--bare',
        // Fresh conversation per run, and never one the caller is also writing to.
        '--session-id',
        randomUUID(),
        '--model',
        model,
        '--mcp-config',
        JSON.stringify({ mcpServers }),
        // Without this the developer's own servers load too and the run stops being a test of
        // this repo's server.
        '--strict-mcp-config',
        // Nobody is at the keyboard: anything not pre-allowed is denied rather than hanging.
        '--permission-prompts',
        'none',
        // Variadic, so an empty list would swallow whatever followed it — and the CLI then reads
        // no prompt at all and produces not one event.
        ...(allowedTools.length > 0 ? ['--allowedTools', ...allowedTools] : []),
      ],
      {
        cwd,
        env: {
          ...env,
          // `claude` reads ANTHROPIC_API_KEY; the suite sources the value from
          // DX_ANTHROPIC_API_KEY so a developer's interactive login is never what it spends.
          ANTHROPIC_API_KEY: apiKey,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        // Its own group: `claude` spawns the MCP server, and killing only `claude` orphans that
        // server against the data directory the test is about to delete.
        detached: true,
      },
    );

    return new ClaudeAgent(child, timeout);
  }

  /**
   * Sends one user message and resolves when that turn's `result` event arrives.
   *
   * One turn at a time: the conversation is a single stream, so a second call while a turn is in
   * flight would take over the first one's callbacks and hand it the other's result. A turn that
   * times out ends the agent rather than only rejecting, because the CLI is still working and its
   * late `result` would otherwise land on whatever turn came next.
   */
  send(prompt: string): Promise<Turn> {
    if (this.#exited) {
      return Promise.reject(this.#exited);
    }
    if (this.#onEvent || this.#onFail) {
      return Promise.reject(new Error('a turn is already in flight; await it before sending the next one'));
    }
    const start = this.#events.length;
    const startedAt = Date.now();
    return new Promise<Turn>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#fail(`turn timed out after ${this.#timeout}ms; last events: ${this.#tail(start)}`);
      }, this.#timeout);

      this.#onFail = (error) => {
        clearTimeout(timer);
        this.#onEvent = undefined;
        reject(error);
      };

      this.#onEvent = (event) => {
        if (event.type !== 'result') {
          return;
        }
        clearTimeout(timer);
        this.#onEvent = undefined;
        this.#onFail = undefined;
        const events = this.#events.slice(start);
        resolve({
          result: typeof event.result === 'string' ? event.result : undefined,
          isError: event.is_error === true,
          toolCalls: toolCallNames(events),
          events,
          start: startedAt,
          end: Date.now(),
        });
      };

      this.#child.stdin.write(
        `${JSON.stringify({
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: prompt }] },
          parent_tool_use_id: null,
        })}\n`,
      );
    });
  }

  /**
   * Ends the agent and waits for the process to go.
   *
   * The whole process group, because `claude` spawns its stdio MCP servers as children: killing
   * only the parent orphans them against whatever data directory the caller is about to delete.
   */
  async close(): Promise<void> {
    // A process that never spawned emits no `exit`, so awaiting one here would hang cleanup.
    if (this.#child.pid === undefined || this.#child.exitCode !== null || this.#child.signalCode !== null) {
      return;
    }
    const exited = new Promise<void>((resolve) => this.#child.once('exit', () => resolve()));
    this.#child.stdin.end();
    try {
      // The whole group, so the MCP server `claude` spawned goes with it.
      process.kill(-this.#child.pid, 'SIGKILL');
    } catch {
      this.#child.kill('SIGKILL');
    }
    await exited;
  }

  #tail(start: number): string {
    return JSON.stringify(this.#events.slice(Math.max(start, this.#events.length - 5))).slice(0, 2000);
  }

  #consume(chunk: string): void {
    this.#buffer += chunk;
    const lines = this.#buffer.split('\n');
    this.#buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }
      let event: any;
      try {
        event = JSON.parse(line);
      } catch {
        // stream-json is line-delimited; anything else on stdout is noise.
        continue;
      }
      this.#events.push(event);
      this.#onEvent?.(event);
    }
  }
}

/** Tool names an assistant event asked for, so a test can assert the agent went through MCP. */
const toolCallNames = (events: any[]): string[] =>
  events
    .filter((event) => event.type === 'assistant')
    .flatMap((event) => event.message?.content ?? [])
    .filter((block: any) => block?.type === 'tool_use')
    .map((block: any) => String(block.name));
