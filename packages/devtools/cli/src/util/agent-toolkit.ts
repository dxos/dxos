//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { OpaqueToolkit } from '@dxos/ai';

import { requestReload } from './reload-signal';

/** Narrow an unknown thrown value to a message without casts. */
const formatError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Cap directory listings so a huge directory cannot flood the context. */
const MAX_LIST_ENTRIES = 1_000;

/**
 * Root the agent's file/shell operations resolve against. Defaults to the process cwd (the checkout
 * the hypervisor launched `dx agent` in). Relative tool paths are resolved from here; absolute paths
 * are used as-is. This is the soft workspace boundary — isolation comes from the container, not this.
 */
const workspaceRoot = (): string => process.env.DX_AGENT_WORKSPACE ?? process.cwd();

const resolvePath = (input: string): string => (path.isAbsolute(input) ? input : path.resolve(workspaceRoot(), input));

/** Guard: refuse to read/emit files larger than this so a stray path cannot blow up the context. */
const MAX_READ_BYTES = 256 * 1024;

/** Hard cap on shell runtime so a hung command cannot wedge the turn. */
const BASH_TIMEOUT_MS = 10 * 60 * 1000;

/** Truncate captured output so a chatty build cannot flood the model context. */
const MAX_OUTPUT_CHARS = 60 * 1024;

const truncate = (text: string): string =>
  text.length <= MAX_OUTPUT_CHARS
    ? text
    : text.slice(0, MAX_OUTPUT_CHARS) + `\n… [truncated ${text.length - MAX_OUTPUT_CHARS} chars]`;

/**
 * File-system and shell tools that let the Composer agent self-edit non-core plugins and drive the
 * build, plus `request_reload` to signal the hypervisor's reload gate. See the agent-harness skill
 * (Aspect B — self-editing): the agent is prompted to touch only leaf plugins and defer core edits.
 */
export const AgentToolkit = Toolkit.make(
  Tool.make('read_file', {
    description: 'Read a UTF-8 text file. Paths are relative to the workspace root unless absolute.',
    parameters: { path: Schema.String.annotations({ description: 'File path to read.' }) },
    success: Schema.String.annotations({ description: 'File contents.' }),
    failure: Schema.String,
    dependencies: [],
  }),
  Tool.make('write_file', {
    description: 'Write (create or overwrite) a UTF-8 text file, creating parent directories as needed.',
    parameters: {
      path: Schema.String.annotations({ description: 'File path to write.' }),
      content: Schema.String.annotations({ description: 'Full file contents.' }),
    },
    success: Schema.String.annotations({ description: 'Confirmation with bytes written.' }),
    failure: Schema.String,
    dependencies: [],
  }),
  Tool.make('edit_file', {
    description:
      'Replace the first exact occurrence of oldText with newText in a file. Fails if oldText is absent or ambiguous.',
    parameters: {
      path: Schema.String.annotations({ description: 'File path to edit.' }),
      oldText: Schema.String.annotations({ description: 'Exact text to find (must be unique).' }),
      newText: Schema.String.annotations({ description: 'Replacement text.' }),
    },
    success: Schema.String.annotations({ description: 'Confirmation.' }),
    failure: Schema.String,
    dependencies: [],
  }),
  Tool.make('list_dir', {
    description: 'List the entries of a directory (relative to the workspace root unless absolute).',
    parameters: { path: Schema.String.annotations({ description: 'Directory path to list.' }) },
    success: Schema.String.annotations({ description: 'Newline-separated entries, directories suffixed with /.' }),
    failure: Schema.String,
    dependencies: [],
  }),
  Tool.make('bash', {
    description:
      'Run a shell command from the workspace root (or the given cwd) and capture stdout, stderr, and exit code. Use for builds, tests, git, and greps.',
    parameters: {
      command: Schema.String.annotations({ description: 'Shell command line to execute.' }),
      cwd: Schema.optional(Schema.String).annotations({
        description: 'Working directory (defaults to workspace root).',
      }),
    },
    success: Schema.String.annotations({ description: 'Combined exit code, stdout, and stderr.' }),
    failure: Schema.String,
    dependencies: [],
  }),
  Tool.make('request_reload', {
    description:
      'Signal the hypervisor that you edited code and need a restart to load it. Call this once after your edits build cleanly; the process then exits so the hypervisor can rebuild and continue you.',
    parameters: {
      reason: Schema.String.annotations({
        description: 'Short description of what changed and why a reload is needed.',
      }),
    },
    success: Schema.String,
    failure: Schema.Never,
    dependencies: [],
  }),
);

export const AgentToolkitLayer = AgentToolkit.toLayer({
  read_file: Effect.fn(function* ({ path: input }) {
    return yield* Effect.tryPromise({
      try: async () => {
        const resolved = resolvePath(input);
        const stat = await fs.stat(resolved);
        if (stat.size > MAX_READ_BYTES) {
          throw new Error(`File too large (${stat.size} bytes > ${MAX_READ_BYTES}).`);
        }
        return await fs.readFile(resolved, 'utf8');
      },
      catch: formatError,
    });
  }),
  write_file: Effect.fn(function* ({ path: input, content }) {
    return yield* Effect.tryPromise({
      try: async () => {
        const resolved = resolvePath(input);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, content, 'utf8');
        return `Wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${resolved}`;
      },
      catch: formatError,
    });
  }),
  edit_file: Effect.fn(function* ({ path: input, oldText, newText }) {
    return yield* Effect.tryPromise({
      try: async () => {
        const resolved = resolvePath(input);
        const stat = await fs.stat(resolved);
        if (stat.size > MAX_READ_BYTES) {
          throw new Error(`File too large (${stat.size} bytes > ${MAX_READ_BYTES}).`);
        }
        const current = await fs.readFile(resolved, 'utf8');
        const first = current.indexOf(oldText);
        if (first === -1) {
          throw new Error('oldText not found.');
        }
        if (current.indexOf(oldText, first + oldText.length) !== -1) {
          throw new Error('oldText is ambiguous (multiple matches); include more context.');
        }
        await fs.writeFile(resolved, current.slice(0, first) + newText + current.slice(first + oldText.length), 'utf8');
        return `Edited ${resolved}`;
      },
      catch: formatError,
    });
  }),
  list_dir: Effect.fn(function* ({ path: input }) {
    return yield* Effect.tryPromise({
      try: async () => {
        const resolved = resolvePath(input);
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const names = entries.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name)).sort();
        const shown = names.slice(0, MAX_LIST_ENTRIES).join('\n');
        return names.length > MAX_LIST_ENTRIES
          ? `${shown}\n… [${names.length - MAX_LIST_ENTRIES} more entries]`
          : shown;
      },
      catch: formatError,
    });
  }),
  bash: Effect.fn(function* ({ command, cwd }) {
    // `detached: true` runs bash as its own process-group leader so a timeout kills the whole tree
    // (`process.kill(-pid)`), not just the shell — otherwise a hung build orphans its children.
    // Streams are captured and bounded, and a non-zero exit is returned as a value (not thrown) so
    // the agent can read a failing build/test instead of losing the output.
    return yield* Effect.promise(
      () =>
        new Promise<string>((resolve) => {
          let stdout = '';
          let stderr = '';
          let killedForOutput = false;
          const child = spawn('bash', ['-lc', command], {
            cwd: cwd ? resolvePath(cwd) : workspaceRoot(),
            detached: true,
          });
          const killGroup = (signal: NodeJS.Signals) => {
            if (child.pid !== undefined) {
              try {
                process.kill(-child.pid, signal);
              } catch {
                child.kill(signal);
              }
            }
          };
          const timer = setTimeout(() => killGroup('SIGKILL'), BASH_TIMEOUT_MS);
          const append = (chunk: Buffer, onStdout: boolean) => {
            const text = chunk.toString('utf8');
            if (onStdout) {
              stdout += text;
            } else {
              stderr += text;
            }
            if (!killedForOutput && stdout.length + stderr.length > MAX_OUTPUT_CHARS * 2) {
              killedForOutput = true;
              killGroup('SIGKILL');
            }
          };
          child.stdout.on('data', (chunk: Buffer) => append(chunk, true));
          child.stderr.on('data', (chunk: Buffer) => append(chunk, false));
          child.on('error', (error) => {
            clearTimeout(timer);
            resolve(truncate(`spawn error: ${formatError(error)}`));
          });
          child.on('close', (code, signal) => {
            clearTimeout(timer);
            const status = killedForOutput ? 'killed (output limit)' : signal ? `killed (${signal})` : `exit ${code}`;
            resolve(truncate(`${status}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`));
          });
        }),
    );
  }),
  request_reload: Effect.fn(function* ({ reason }) {
    requestReload(reason);
    return `Reload requested: ${reason}`;
  }),
}) satisfies Layer.Layer<
  | Tool.Handler<'read_file'>
  | Tool.Handler<'write_file'>
  | Tool.Handler<'edit_file'>
  | Tool.Handler<'list_dir'>
  | Tool.Handler<'bash'>
  | Tool.Handler<'request_reload'>
>;

/** OpaqueToolkit wrapper for registration in the CLI's toolkit list. */
export const AgentToolkitOpaque = OpaqueToolkit.make(AgentToolkit, AgentToolkitLayer);
