//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { createServer } from 'node:http';

import { LIVE_GMAIL_ACCOUNT } from '../../testing/live-credentials.ts';
import { CanaryError } from '../errors.ts';

/** Insert, import, label and trash: what the canary does to the test account. */
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

/**
 * The test account's own OAuth grant (an OAuth client and a refresh token with `gmail.modify`).
 * The canary runs outside EDGE, so it cannot use the kms-managed token the sync uses.
 */
export type GmailCredentials = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
};

/** The only mailbox the canary may write to; override with `GMAIL_ACCOUNT`. */
export const canaryAccount = (env = process.env): string => env.GMAIL_ACCOUNT ?? LIVE_GMAIL_ACCOUNT;

/** Reads the grant from `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN`. */
export const credentialsFromEnv = (env = process.env): GmailCredentials | undefined =>
  env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN
    ? { clientId: env.GMAIL_CLIENT_ID, clientSecret: env.GMAIL_CLIENT_SECRET, refreshToken: env.GMAIL_REFRESH_TOKEN }
    : undefined;

// Fixed, because the shared EDGE dev OAuth client is a Web client that only accepts redirects it lists.
const AUTH_PORT = 53682;

/** The redirect `auth` uses; register it on the OAuth client. */
export const AUTH_REDIRECT_URI = `http://127.0.0.1:${AUTH_PORT}/`;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const TokenResponse = Schema.Struct({ access_token: Schema.String });
const CodeExchange = Schema.Struct({
  refresh_token: Schema.optional(Schema.String),
  // Google sets it only when the user granted time-based access; an open-ended grant has none.
  refresh_token_expires_in: Schema.optional(Schema.Number),
});

/**
 * Mints an access token from the refresh token. A dead grant fails with Google's `invalid_grant` in the
 * message, which the nightly reports as AUTH.
 */
export const accessToken = ({ clientId, clientSecret, refreshToken }: GmailCredentials) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${response.status}: ${text.slice(0, 500)}`);
      }
      return Schema.decodeUnknownSync(TokenResponse)(JSON.parse(text)).access_token;
    },
    catch: (cause) => new CanaryError({ message: `cannot mint a Gmail access token: ${String(cause)}` }),
  });

/**
 * Mints a refresh token for the canary's own Gmail grant with a one-time browser consent.
 *
 * The callback server listens on `AUTH_REDIRECT_URI`, which the OAuth client must list as an
 * authorized redirect (a Desktop client accepts it without registration). Prints the consent URL;
 * open it on the same machine while signed in as the test account.
 */
export const mintRefreshToken = ({
  clientId,
  clientSecret,
  loginHint,
}: {
  clientId: string;
  clientSecret: string;
  loginHint: string;
}): Effect.Effect<string, CanaryError> =>
  Effect.tryPromise({
    try: () =>
      new Promise<string>((resolve, reject) => {
        const server = createServer(async (incoming, response) => {
          const url = new URL(incoming.url ?? '/', 'http://127.0.0.1');
          const code = url.searchParams.get('code');
          if (!code) {
            response.writeHead(404).end();
            return;
          }
          response.writeHead(200, { 'content-type': 'text/plain' }).end('Authorized. Return to the terminal.');
          server.close();
          try {
            const exchange = await fetch(TOKEN_URL, {
              method: 'POST',
              headers: { 'content-type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: AUTH_REDIRECT_URI,
                grant_type: 'authorization_code',
              }),
            });
            const body = Schema.decodeUnknownSync(CodeExchange)(await exchange.json());
            if (!body.refresh_token) {
              throw new Error('Google returned no refresh token; revoke the app at myaccount.google.com and retry.');
            }
            if (body.refresh_token_expires_in !== undefined) {
              const days = Math.round(body.refresh_token_expires_in / 86_400);
              throw new Error(
                `Google granted time-based access that ends in ${days} days; retry and grant ongoing access.`,
              );
            }
            resolve(body.refresh_token);
          } catch (error) {
            reject(error);
          }
        });
        server.listen(AUTH_PORT, '127.0.0.1', () => {
          const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          consent.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: AUTH_REDIRECT_URI,
            response_type: 'code',
            scope: GMAIL_MODIFY_SCOPE,
            access_type: 'offline',
            prompt: 'consent',
            login_hint: loginHint,
          }).toString();
          console.error(`Open this URL signed in as ${loginHint}:\n\n${consent}\n`);
        });
      }),
    catch: (cause) => new CanaryError({ message: `consent failed: ${String(cause)}` }),
  });
