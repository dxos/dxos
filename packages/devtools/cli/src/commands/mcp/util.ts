//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Options from 'effect/unstable/cli/Flag';

import { BaseError } from '@dxos/errors';

import { type McpSession, McpSession as McpSessionSchema, loadSession, sessionDir } from './client.ts';

export class McpSessionError extends BaseError.extend('McpSessionError', 'MCP session error') {}

/**
 * Server to act on. Optional: with a single stored session the commands pick it up automatically,
 * which keeps the common case to `dx mcp tools` / `dx mcp call <tool>`.
 */
export const serverUrlOption = Options.string('url').pipe(
  Options.withDescription('MCP server URL. Defaults to the most recently connected server.'),
  Options.optional,
);

/** Resolves the stored session for a server, failing with actionable guidance when absent. */
export const requireSession = (
  profile: string,
  url: Option.Option<string>,
): Effect.Effect<McpSession, McpSessionError, never> =>
  Effect.gen(function* () {
    const serverUrl = Option.getOrUndefined(url);
    if (!serverUrl) {
      const stored = yield* lastSession(profile);
      if (!stored) {
        return yield* Effect.fail(
          new McpSessionError({ message: 'No MCP session. Run `dx mcp connect <url>` first.' }),
        );
      }
      return stored;
    }
    const session = yield* loadSession(profile, serverUrl);
    if (!session) {
      return yield* Effect.fail(
        new McpSessionError({ message: `Not connected to ${serverUrl}. Run \`dx mcp connect ${serverUrl}\`.` }),
      );
    }
    return session;
  });

/** Most recently written session for the profile, or undefined when none exist. */
const lastSession = (profile: string): Effect.Effect<McpSession | undefined, McpSessionError, never> =>
  Effect.gen(function* () {
    const { readdir, readFile, stat } = yield* Effect.promise(() => import('node:fs/promises'));
    const { join } = yield* Effect.promise(() => import('node:path'));
    const dir = sessionDir(profile);
    const files = yield* Effect.tryPromise({
      try: () => readdir(dir),
      catch: (error) => new McpSessionError({ message: `Failed to read session directory ${dir}`, cause: error }),
    }).pipe(
      // Only a missing directory is normal (first run); permission and I/O errors must surface.
      Effect.catchIf(
        (error) => (error.cause as NodeJS.ErrnoException | undefined)?.code === 'ENOENT',
        () => Effect.succeed([] as string[]),
      ),
    );

    // A session file can disappear between `readdir` and `stat`; fail typed rather than letting
    // the rejection become an unrecoverable defect.
    const stamped = yield* Effect.tryPromise({
      try: () =>
        Promise.all(
          files
            .filter((file) => file.endsWith('.json'))
            .map(async (file) => ({ file, mtime: (await stat(join(dir, file))).mtimeMs })),
        ),
      catch: (error) => new McpSessionError({ message: `Failed to inspect sessions in ${dir}`, cause: error }),
    });
    const latest = stamped.sort((left, right) => right.mtime - left.mtime)[0];
    if (!latest) {
      return undefined;
    }

    const raw = yield* Effect.tryPromise({
      try: () => readFile(join(dir, latest.file), 'utf8'),
      catch: (error) => new McpSessionError({ message: `Failed to read session ${latest.file}`, cause: error }),
    });
    return yield* decodeSession(raw, latest.file);
  });

/** Persisted sessions are decoded rather than trusted: the file is user-editable state. */
export const decodeSession = (raw: string, label: string): Effect.Effect<McpSession, McpSessionError, never> =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(McpSessionSchema))(raw).pipe(
    Effect.mapError(
      (error) =>
        new McpSessionError({
          message: `Stored session ${label} is invalid; re-run \`dx mcp connect\`.`,
          cause: error,
        }),
    ),
  );
