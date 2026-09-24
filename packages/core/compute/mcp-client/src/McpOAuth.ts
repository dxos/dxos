//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type OAuthClientProvider, UnauthorizedError, auth } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import * as Effect from 'effect/Effect';

/** The client Composer registered with the server's authorization server (RFC 7591). */
export type Registration = {
  clientId: string;
  clientSecret?: string;
  /** The redirect URI registered with the client; a later refresh presents the same registration. */
  redirectUrl?: string;
};

export type Tokens = {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  scope?: string;
};

/**
 * Where a server's OAuth state is kept. Registration and tokens outlive one connection: the agent
 * that refreshes the tokens is often not the browser that signed in.
 */
export interface Store {
  registration(): Registration | undefined;
  saveRegistration(registration: Registration): void;
  tokens(): Tokens | undefined;
  saveTokens(tokens: Tokens | undefined): void;
}

export type ProviderOptions = {
  store: Store;
  /** Where the authorization server returns the browser; defaults to the one registered. */
  redirectUrl?: string;
  /**
   * Navigates the user agent to the authorization URL. Without it the provider uses and refreshes
   * stored tokens but fails with `UnauthorizedError` where a new sign-in is needed.
   */
  onAuthorize?: (authorizationUrl: URL) => void;
  clientName?: string;
};

export type Provider = OAuthClientProvider & {
  /** The `state` sent with the last authorization request, which the callback must echo. */
  readonly pendingState: string | undefined;
};

const DEFAULT_CLIENT_NAME = 'DXOS Composer';

/**
 * Builds the MCP SDK's {@link OAuthClientProvider} over a {@link Store}. The PKCE verifier and
 * `state` stay in memory: they only span one interactive authorization in one browser.
 */
export const makeProvider = ({
  store,
  redirectUrl = store.registration()?.redirectUrl,
  onAuthorize,
  clientName = DEFAULT_CLIENT_NAME,
}: ProviderOptions): Provider => {
  let codeVerifier: string | undefined;
  let pendingState: string | undefined;

  const clientMetadata: OAuthClientMetadata = {
    client_name: clientName,
    redirect_uris: redirectUrl ? [redirectUrl] : [],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    // A browser cannot keep a secret; PKCE protects the code instead.
    token_endpoint_auth_method: 'none',
  };

  return {
    get redirectUrl() {
      return redirectUrl;
    },
    get clientMetadata() {
      return clientMetadata;
    },
    get pendingState() {
      return pendingState;
    },
    state: () => {
      pendingState = crypto.randomUUID();
      return pendingState;
    },
    clientInformation: (): OAuthClientInformationMixed | undefined => {
      const registration = store.registration();
      return registration && { client_id: registration.clientId, client_secret: registration.clientSecret };
    },
    saveClientInformation: (information) => {
      store.saveRegistration({ clientId: information.client_id, clientSecret: information.client_secret, redirectUrl });
    },
    tokens: () => toSdkTokens(store.tokens()),
    saveTokens: (tokens) => {
      store.saveTokens(fromSdkTokens(tokens));
    },
    redirectToAuthorization: (authorizationUrl) => {
      if (!onAuthorize) {
        throw new UnauthorizedError('Sign-in required.');
      }
      onAuthorize(authorizationUrl);
    },
    saveCodeVerifier: (verifier) => {
      codeVerifier = verifier;
    },
    codeVerifier: () => {
      if (codeVerifier === undefined) {
        throw new Error('No authorization in progress.');
      }
      return codeVerifier;
    },
    invalidateCredentials: (scope) => {
      if (scope === 'all' || scope === 'tokens') {
        store.saveTokens(undefined);
      }
      if (scope === 'all' || scope === 'verifier') {
        codeVerifier = undefined;
      }
    },
  };
};

/**
 * Starts (or, with stored tokens, refreshes) authorization for the server at `serverUrl`.
 * Resolves `'REDIRECT'` once the provider has sent the user agent to the authorization server.
 */
export const authorize = (provider: Provider, serverUrl: string) =>
  Effect.tryPromise(() => auth(provider, { serverUrl }));

/** Exchanges the code the authorization server returned for tokens, which the provider stores. */
export const completeAuthorization = (provider: Provider, serverUrl: string, authorizationCode: string) =>
  Effect.tryPromise(() => auth(provider, { serverUrl, authorizationCode }));

const toSdkTokens = (tokens: Tokens | undefined): OAuthTokens | undefined =>
  tokens && {
    access_token: tokens.accessToken,
    token_type: tokens.tokenType,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
    expires_in:
      tokens.expiresAt === undefined ? undefined : Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000)),
  };

const fromSdkTokens = (tokens: OAuthTokens): Tokens => ({
  accessToken: tokens.access_token,
  tokenType: tokens.token_type,
  refreshToken: tokens.refresh_token,
  scope: tokens.scope,
  expiresAt: tokens.expires_in === undefined ? undefined : Date.now() + tokens.expires_in * 1000,
});
