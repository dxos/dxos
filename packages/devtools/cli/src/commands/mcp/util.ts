//
// Copyright 2026 DXOS.org
//

import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type McpSession, loadSession } from './client';

/**
 * Server to act on. Optional: with a single stored session the commands pick it up automatically,
 * which keeps the common case to `dx mcp tools` / `dx mcp call <tool>`.
 */
export const serverUrlOption = Options.text('url').pipe(
  Options.withDescription('MCP server URL. Defaults to the most recently connected server.'),
  Options.optional,
);

/** Resolves the stored session for a server, failing with actionable guidance when absent. */
export const requireSession = (profile: string, url: Option.Option<string>): Effect.Effect<McpSession, Error, never> =>
  Effect.gen(function* () {
    const serverUrl = Option.getOrUndefined(url);
    if (!serverUrl) {
      const stored = yield* Effect.promise(() => lastSession(profile));
      if (!stored) {
        return yield* Effect.fail(new Error('No MCP session. Run `dx mcp connect <url>` first.'));
      }
      return stored;
    }
    const session = yield* Effect.promise(() => loadSession(profile, serverUrl));
    if (!session) {
      return yield* Effect.fail(new Error(`Not connected to ${serverUrl}. Run \`dx mcp connect ${serverUrl}\`.`));
    }
    return session;
  });

/** Most recently written session for the profile, or undefined when none exist. */
const lastSession = async (profile: string): Promise<McpSession | undefined> => {
  const { readdir, readFile, stat } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { DX_STATE, getProfilePath } = await import('@dxos/client-protocol');
  const dir = join(getProfilePath(DX_STATE, profile), 'mcp');
  try {
    const files = await readdir(dir);
    const stamped = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => ({ file, mtime: (await stat(join(dir, file))).mtimeMs })),
    );
    const latest = stamped.sort((a, b) => b.mtime - a.mtime)[0];
    return latest ? JSON.parse(await readFile(join(dir, latest.file), 'utf8')) : undefined;
  } catch {
    return undefined;
  }
};
