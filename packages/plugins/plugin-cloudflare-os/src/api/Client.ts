//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type RpcStub, newHttpBatchRpcSession, newWebSocketRpcSession } from 'capnweb';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { CloudflareOsError } from './errors.ts';
import * as Protocol from './Protocol.ts';

/** The deployment Composer connects to when the user names none. */
export const DEFAULT_URL = 'https://cloudflareos.dxos.network';

/** The deployment's base URL, from the hostname stored as the connection's `AccessToken.source`. */
export const urlFromHost = (host: string): string => `https://${host}`;

/** The hostname an `AccessToken.source` stores for a deployment URL. */
export const hostFromUrl = (url: string): string => new URL(url).host;

/** The WebSocket endpoint that serves the Workshop's Cap'n Web API. */
export const apiEndpoint = (url: string): string => {
  const endpoint = new URL('/api', url);
  endpoint.protocol = endpoint.protocol === 'http:' ? 'ws:' : 'wss:';
  return endpoint.toString();
};

/**
 * The password hash the Workshop expects from `login()`: argon2id over the password, salted with the
 * service salt followed by the username, so the server never sees the password itself.
 */
export const hashPassword = (username: string, password: string): Effect.Effect<Uint8Array, CloudflareOsError> =>
  Effect.tryPromise({
    try: async () => {
      const { argon2id } = await import('hash-wasm');
      const user = new TextEncoder().encode(username);
      const salt = new Uint8Array(Protocol.SERVICE_SALT.length + user.length);
      salt.set(Protocol.SERVICE_SALT);
      salt.set(user, Protocol.SERVICE_SALT.length);
      return argon2id({
        password,
        salt,
        parallelism: 1,
        iterations: 3,
        memorySize: 65536,
        hashLength: 32,
        outputType: 'binary',
      });
    },
    catch: (cause) => new CloudflareOsError({ message: 'Could not hash the password.', cause }),
  });

/** Calls one RPC, mapping its rejection to a typed error. */
export const call = <T>(message: string, run: () => PromiseLike<T>): Effect.Effect<T, CloudflareOsError> =>
  Effect.tryPromise({ try: () => Promise.resolve(run()), catch: (cause) => new CloudflareOsError({ message, cause }) });

/**
 * Settles with `promise`, or rejects once `timeoutMs` passes; for a request that must finish even while its
 * effect is uninterruptible, where an Effect timeout could not cut it short.
 */
export const withDeadline = <T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer within ${timeoutMs} ms.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), expired]).finally(() => clearTimeout(timer));
};

/** Disposes an RPC stub; a stub whose session already closed has nothing left to release. */
export const dispose = (stub: { [Symbol.dispose](): void }): void => {
  try {
    stub[Symbol.dispose]();
  } catch {
    // The session is gone, so the server side is released already.
  }
};

/** The HTTP endpoint that serves the same API as one-request batches. */
export const batchEndpoint = (url: string): string => new URL('/api', url).toString();

/**
 * A one-request session to the deployment's public API: every call made before the first await goes
 * in one HTTP request, pipelined. A request has no connection to lose, so a long wait polls with these.
 */
export const newBatch = (url: string): RpcStub<Protocol.PublicApi> =>
  newHttpBatchRpcSession<Protocol.PublicApi>(batchEndpoint(url));

/** Opens a WebSocket session to the deployment's public API; the caller disposes it. */
export const newSession = (url: string): RpcStub<Protocol.PublicApi> =>
  newWebSocketRpcSession<Protocol.PublicApi>(apiEndpoint(url));

/** A WebSocket session to the deployment's public API, closed with the scope. */
export const session = (url: string): Effect.Effect<RpcStub<Protocol.PublicApi>, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => newSession(url)),
    (stub) => Effect.sync(() => dispose(stub)),
  );

/** Signs in with a username and password, returning the session token `authenticate()` takes later. */
export const login: (credentials: {
  url: string;
  username: string;
  password: string;
}) => Effect.Effect<string, CloudflareOsError> = Effect.fnUntraced(function* ({ url, username, password }) {
  const api = yield* session(url);
  const passwordHash = yield* hashPassword(username, password);
  const token = yield* call('Cloudflare OS refused the sign-in.', () => api.login(username, passwordHash));
  if (!token) {
    return yield* Effect.fail(new CloudflareOsError({ message: 'Wrong username or password.' }));
  }
  return token;
}, Effect.scoped);

/** An authenticated session for a stored session token, closed with the scope. */
export const authenticate = ({
  url,
  token,
}: {
  url: string;
  token: string;
}): Effect.Effect<RpcStub<Protocol.AuthenticatedApi>, CloudflareOsError, Scope.Scope> =>
  Effect.gen(function* () {
    const api = yield* session(url);
    const user = api.authenticate(token);
    // Pipelined: the call above resolves only once the server accepts the token, which this awaits.
    yield* call('Cloudflare OS rejected the session token. Reconnect the account.', () => user.listWorkspaces());
    return user;
  });
