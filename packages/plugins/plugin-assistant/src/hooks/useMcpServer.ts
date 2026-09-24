//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useState } from 'react';

import * as McpServer from '@dxos/compute/McpServer';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { McpOAuth, McpToolkit } from '@dxos/mcp-client';

export type McpServerStatus =
  | { state: 'disabled' }
  | { state: 'checking' }
  | { state: 'connected'; tools: string[] }
  | { state: 'unauthorized'; message: string }
  | { state: 'error'; message: string };

/** Served by composer-app from `public/`; relays the authorization response on {@link OAUTH_CHANNEL}. */
const OAUTH_CALLBACK_PATH = '/mcp-oauth-callback.html';
const OAUTH_CHANNEL = 'dxos.mcp-oauth';
const SIGN_IN_TIMEOUT = Duration.minutes(5);

type CallbackResult = { code?: string; state?: string; error?: string };

/** The interactive part of an MCP sign-in failed; `message` is shown on the server's row. */
class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInError')('McpSignInError', {
  message: Schema.String,
}) {}

/**
 * The server's connection options as this browser can build them: the same credentials the agent
 * resolves each turn, minus EDGE-custodied tokens, which the UI cannot read.
 */
const toOptions = async (server: McpServer.McpServer): Promise<McpToolkit.Options> => {
  const options: McpToolkit.Options = { url: server.url, protocol: server.protocol, apiKey: server.apiKey };
  if (server.oauth?.tokens) {
    return { ...options, authProvider: McpOAuth.makeProvider({ store: McpServer.oauthStore(server) }) };
  }
  const accessToken = await server.accessToken?.tryLoad();
  return accessToken ? { ...options, apiKey: accessToken.token } : options;
};

/**
 * Checks that the server answers with the configured credentials. `revision` re-runs the check, e.g.
 * after signing in.
 */
export const useMcpServerStatus = (
  server: McpServer.McpServer,
  { enabled, revision }: { enabled: boolean; revision: number },
): McpServerStatus => {
  const [status, setStatus] = useState<McpServerStatus>({ state: enabled ? 'checking' : 'disabled' });
  const url = server.url;
  const signedIn = server.oauth?.tokens !== undefined;

  useEffect(() => {
    if (!enabled) {
      setStatus({ state: 'disabled' });
      return;
    }

    let cancelled = false;
    setStatus({ state: 'checking' });
    void Effect.tryPromise({
      try: () => toOptions(server),
      catch: (cause) =>
        new McpToolkit.McpConnectionError({
          url: server.url,
          protocol: server.protocol,
          message: `Failed to load the server's credentials: ${McpToolkit.formatCause(cause)}`,
        }),
    })
      .pipe(
        Effect.flatMap(McpToolkit.probe),
        Effect.match({
          onSuccess: ({ tools }): McpServerStatus => ({ state: 'connected', tools }),
          onFailure: (error): McpServerStatus =>
            error.unauthorized
              ? { state: 'unauthorized', message: error.message }
              : { state: 'error', message: error.message },
        }),
        EffectEx.runAndForwardErrors,
      )
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [server, url, enabled, signedIn, revision]);

  return status;
};

/**
 * Signs in to a server that uses MCP authorization (OAuth 2.1): discovers its authorization server,
 * registers Composer as a client, and runs the PKCE code flow in a popup. The tokens land on the
 * server object, where every agent in the space picks them up.
 */
export const useMcpServerSignIn = (server: McpServer.McpServer) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const signIn = useCallback(async () => {
    // Opened synchronously in the click handler: discovery and registration are awaited before the
    // authorization URL is known, and a popup opened after an await is blocked.
    const popup = window.open('about:blank', 'dxos-mcp-oauth', 'popup,width=520,height=720');
    setPending(true);
    setError(undefined);
    try {
      await EffectEx.runAndForwardErrors(authorize(server, popup));
    } catch (err) {
      log.warn('MCP sign-in failed', { url: server.url, error: err });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      popup?.close();
      setPending(false);
    }
  }, [server]);

  return { signIn, pending, error };
};

const authorize = (server: McpServer.McpServer, popup: Window | null) =>
  Effect.gen(function* () {
    if (!popup) {
      return yield* Effect.fail(new McpSignInError({ message: 'The sign-in window was blocked.' }));
    }

    const provider = McpOAuth.makeProvider({
      store: McpServer.oauthStore(server),
      redirectUrl: new URL(OAUTH_CALLBACK_PATH, window.location.origin).href,
      onAuthorize: (authorizationUrl) => {
        popup.location.href = authorizationUrl.href;
      },
    });

    // Every sign-in in this origin hears every callback; only the one whose `state` it echoes is ours.
    const callback = yield* Deferred.make<CallbackResult>();
    const channel = new BroadcastChannel(OAUTH_CHANNEL);
    channel.onmessage = (event: MessageEvent<CallbackResult>) => {
      if (event.data.state !== undefined && event.data.state === provider.pendingState) {
        Deferred.doneUnsafe(callback, Effect.succeed(event.data));
      }
    };
    yield* Effect.addFinalizer(() => Effect.sync(() => channel.close()));

    const result = yield* McpOAuth.authorize(provider, server.url);
    if (result === 'AUTHORIZED') {
      // Stored tokens were still good, or were refreshed without the user.
      return;
    }

    const { code, error } = yield* Deferred.await(callback).pipe(
      Effect.timeoutOrElse({
        duration: SIGN_IN_TIMEOUT,
        orElse: () => Effect.fail(new McpSignInError({ message: 'Timed out waiting for sign-in.' })),
      }),
    );
    if (error || !code) {
      return yield* Effect.fail(new McpSignInError({ message: error ?? 'The authorization server returned no code.' }));
    }

    yield* McpOAuth.completeAuthorization(provider, server.url, code);
  }).pipe(Effect.scoped);
