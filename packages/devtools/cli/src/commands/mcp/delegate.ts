//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CommandConfig } from '@dxos/cli-util';
import { BaseError } from '@dxos/errors';

import { createPkce, redeemCode, registerClient, saveSession, serverBase, sessionDir } from './client.ts';
import { DEFAULT_MCP_URL, MCP_URL_ENV } from './util.ts';

class McpDelegateError extends BaseError.extend('McpDelegateError', 'MCP delegation failed') {}

/** Between the two steps the verifier waits on disk; the code that passes through the model is useless without it. */
const PendingDelegation = Schema.Struct({
  serverUrl: Schema.String,
  clientId: Schema.String,
  codeVerifier: Schema.String,
});

// Not `.json`: `lastSession` picks the newest `.json` in the directory as the default session.
const pendingPath = (profile: string, serverUrl: string): string =>
  join(sessionDir(profile), `${new URL(serverUrl).host}.pending`);

/**
 * Takes over an MCP session the agent already holds, in two steps around the server's
 * `delegateToCli` tool: `dx mcp delegate` registers a client and prints a PKCE challenge, the agent
 * passes it to the tool, and `dx mcp delegate --code <code>` redeems the code the tool returns.
 * The CLI ends up with the same identity and spaces as that session, and its own refresh token.
 */
export const delegate = Command.make(
  'delegate',
  {
    code: Options.String('code').pipe(
      Options.withDescription('Code returned by the MCP tool `delegateToCli`; redeems it and stores the session.'),
      Options.optional,
    ),
    url: Options.String('url').pipe(
      Options.withDescription(`MCP server URL. Defaults to $${MCP_URL_ENV} or ${DEFAULT_MCP_URL}.`),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ code, url }) {
    const { profile } = yield* CommandConfig;
    const base = serverBase(Option.getOrElse(url, () => process.env[MCP_URL_ENV] ?? DEFAULT_MCP_URL));
    const path = pendingPath(profile, base);

    if (Option.isNone(code)) {
      const clientId = yield* Effect.tryPromise({
        try: () => registerClient(base),
        catch: (cause) => new McpDelegateError({ message: `Client registration failed at ${base}`, cause }),
      });
      const { codeVerifier, codeChallenge } = createPkce();
      yield* Effect.tryPromise({
        try: async () => {
          await mkdir(sessionDir(profile), { recursive: true });
          await writeFile(path, JSON.stringify({ serverUrl: base, clientId, codeVerifier }), { mode: 0o600 });
        },
        catch: (cause) => new McpDelegateError({ message: 'Failed to store the pending delegation', cause }),
      });
      yield* Console.log(
        JSON.stringify(
          {
            clientId,
            codeChallenge,
            next: 'Call the MCP tool delegateToCli with { clientId, codeChallenge }, then run `dx mcp delegate --code <code>`.',
          },
          null,
          2,
        ),
      );
      return;
    }

    const pending = yield* Effect.tryPromise({
      try: () => readFile(path, 'utf8'),
      catch: (cause) =>
        new McpDelegateError({ message: `No pending delegation for ${base}; run \`dx mcp delegate\` first.`, cause }),
    }).pipe(
      Effect.flatMap((raw) => Schema.decodeUnknownEffect(Schema.fromJsonString(PendingDelegation))(raw)),
      Effect.mapError((cause) => new McpDelegateError({ message: 'Pending delegation is unreadable.', cause })),
    );

    const tokens = yield* Effect.tryPromise({
      try: () => redeemCode({ base, clientId: pending.clientId, code: code.value, codeVerifier: pending.codeVerifier }),
      catch: (cause) => new McpDelegateError({ message: 'Code exchange failed', cause }),
    });
    yield* Effect.tryPromise({
      try: async () => {
        await saveSession(profile, {
          serverUrl: base,
          clientId: pending.clientId,
          ...tokens,
          identityKey: '',
          spaceIds: [],
        });
        await rm(path, { force: true });
      },
      catch: (cause) => new McpDelegateError({ message: 'Failed to store the MCP session', cause }),
    });

    // The tokens stay on disk: printing them would put them back into the model's context.
    yield* Console.log(JSON.stringify({ serverUrl: base, connected: true }));
  }),
).pipe(Command.withDescription('Take over an MCP session held by an agent, via the server tool `delegateToCli`.'));
