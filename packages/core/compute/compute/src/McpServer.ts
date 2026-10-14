//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

/**
 * MCP server connection spec — the minimal fields needed to dial an MCP server.
 *
 * Used as a value type embedded in skills and passed to runtime session connect logic.
 * The user-facing ECHO object ({@link McpServer}) composes this struct and adds instance-level
 * fields (`enabled`, credentials) and ECHO annotations.
 */
export const Spec = Schema.Struct({
  name: Schema.String.pipe(Schema.optional).annotate({
    description: 'Human-readable name of the MCP server',
  }),

  url: Schema.String.annotate({
    description: 'URL of the MCP server',
  }),

  /**
   * Transport protocol. Prefer `'http'` (Streamable HTTP) for new servers; `'sse'` is
   * kept for compatibility with servers that haven't migrated and is deprecated per
   * the MCP SDK. Clients support both during the migration period.
   */
  protocol: Schema.Union([Schema.Literal('http'), Schema.Literal('sse')]).annotate({
    description: 'Transport protocol of the MCP server (prefer "http"; "sse" deprecated)',
  }),

  /**
   * Optional API key sent as a Bearer token.
   * Persisted in plaintext wherever the spec is stored; a space-level {@link McpServer} references an
   * `AccessToken` instead.
   */
  apiKey: Schema.optional(Schema.String).annotate({
    description: 'Optional API key sent with requests',
  }),
});

export type Spec = Schema.Schema.Type<typeof Spec>;

/**
 * Tokens issued to Composer by the server's authorization server (MCP authorization, OAuth 2.1).
 */
export const OAuthTokens = Schema.Struct({
  accessToken: Schema.String,
  tokenType: Schema.String,
  refreshToken: Schema.optional(Schema.String),
  /** Epoch milliseconds; absent when the server did not say. */
  expiresAt: Schema.optional(Schema.Number),
  scope: Schema.optional(Schema.String),
});

export type OAuthTokens = Schema.Schema.Type<typeof OAuthTokens>;

/**
 * OAuth state for a server that requires authorization. The client registration is kept alongside
 * the tokens because a refresh must present the same client id the tokens were issued to, and the
 * agent refreshing them may be hosted on EDGE rather than in the browser that signed in.
 */
export const OAuthState = Schema.Struct({
  clientId: Schema.String,
  clientSecret: Schema.optional(Schema.String),
  redirectUrl: Schema.optional(Schema.String),
  tokens: Schema.optional(OAuthTokens),
});

export type OAuthState = Schema.Schema.Type<typeof OAuthState>;

/**
 * MCP server configuration stored as a space-level ECHO object; every enabled one is connected at
 * the start of each agent turn in the space.
 *
 * NOTE: OAuth tokens and legacy `apiKey` values are stored in plaintext and replicated to all peers
 * with access to the space, as are non-managed `AccessToken` values.
 */
export class McpServer extends Type.makeObject<McpServer>(DXN.make('org.dxos.type.assistant.mcpServer', '0.1.0'))(
  Schema.Struct({
    ...Spec.fields,
    enabled: Schema.optional(Schema.Boolean),
    /** Static credential sent as a Bearer token. */
    accessToken: Schema.optional(Ref.Ref(AccessToken.AccessToken)),
    /** Present once the server has been signed in to via OAuth. */
    oauth: Schema.optional(OAuthState),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--plugs-connected--regular', hue: 'sky' }),
  ),
) {}

/**
 * The server's OAuth state as the store `@dxos/mcp-client`'s `McpOAuth` provider reads and writes,
 * so whichever peer refreshes the tokens (browser or EDGE agent) persists them for the others.
 */
export const oauthStore = (server: McpServer) => ({
  registration: () =>
    server.oauth && {
      clientId: server.oauth.clientId,
      clientSecret: server.oauth.clientSecret,
      redirectUrl: server.oauth.redirectUrl,
    },
  saveRegistration: (registration: { clientId: string; clientSecret?: string; redirectUrl?: string } | undefined) => {
    // A new (or discarded) registration invalidates tokens issued to the previous client id.
    Obj.update(server, (server) => {
      if (!registration) {
        delete server.oauth;
        return;
      }
      const { clientId, clientSecret, redirectUrl } = registration;
      server.oauth = {
        clientId,
        ...(clientSecret !== undefined && { clientSecret }),
        ...(redirectUrl !== undefined && { redirectUrl }),
      };
    });
  },
  tokens: () => server.oauth?.tokens,
  saveTokens: (tokens: OAuthTokens | undefined) => {
    Obj.update(server, (server) => {
      if (server.oauth) {
        const { tokens: _previous, ...registration } = server.oauth;
        server.oauth = { ...registration, ...(tokens && { tokens: storedTokens(tokens) }) };
      }
    });
  },
});

/** ECHO keeps an explicit `undefined` as a key, so absent optional fields are left out instead. */
const storedTokens = ({ accessToken, tokenType, refreshToken, expiresAt, scope }: OAuthTokens): OAuthTokens => ({
  accessToken,
  tokenType,
  ...(refreshToken !== undefined && { refreshToken }),
  ...(expiresAt !== undefined && { expiresAt }),
  ...(scope !== undefined && { scope }),
});
