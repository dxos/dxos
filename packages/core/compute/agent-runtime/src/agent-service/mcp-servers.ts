//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Credential from '@dxos/compute/Credential';
import * as McpServer from '@dxos/compute/McpServer';
import { Database, Filter, type Ref } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import { McpOAuth, type McpToolkit } from '@dxos/mcp-client';

/**
 * The space's enabled MCP servers as connection options, read at the start of every turn so a server
 * added, toggled or signed in to from the chat's options applies from the next turn on.
 */
export const loadSpaceMcpServers = (): Effect.Effect<
  McpToolkit.Options[],
  never,
  Database.Service | Credential.CredentialsService
> =>
  Effect.gen(function* () {
    const servers = yield* Database.query(Filter.type(McpServer.McpServer)).run;
    return yield* Effect.forEach(
      servers.filter((server) => server.enabled !== false),
      toOptions,
    );
  });

const toOptions = (
  server: McpServer.McpServer,
): Effect.Effect<McpToolkit.Options, never, Database.Service | Credential.CredentialsService> =>
  Effect.gen(function* () {
    const options: McpToolkit.Options = { url: server.url, protocol: server.protocol, apiKey: server.apiKey };
    if (server.oauth?.tokens) {
      // No `onAuthorize`: the agent uses and refreshes the stored tokens but cannot start a sign-in.
      return { ...options, authProvider: McpOAuth.makeProvider({ store: McpServer.oauthStore(server) }) };
    }
    if (server.accessToken) {
      const apiKey = yield* resolveAccessToken(server.accessToken);
      return Option.isSome(apiKey) ? { ...options, apiKey: apiKey.value } : options;
    }
    return options;
  });

/**
 * Resolves through {@link Credential.CredentialsService} rather than reading `token` directly, so a
 * token EDGE custodies (a managed one) resolves the same way a pasted one does.
 */
const resolveAccessToken = (ref: Ref.Ref<AccessToken.AccessToken>) =>
  Effect.gen(function* () {
    const accessToken = yield* Database.load(ref);
    const credentials = yield* Credential.CredentialsService;
    const credential = yield* Effect.tryPromise(() => credentials.getCredential({ accessTokenId: accessToken.id }));
    return Option.fromNullishOr(credential.apiKey);
  }).pipe(
    // The connection then goes out without a key, and the server's 401 reports what is wrong.
    Effect.tapError((error) => Effect.sync(() => log.warn('failed to resolve MCP server credential', { error }))),
    Effect.orElseSucceed(() => Option.none<string>()),
  );
