//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { createServer } from 'node:http';

import { GmailError } from './gmail.ts';

/** Insert, import, label and trash: what the canary does to the test account. */
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

const CodeExchange = Schema.Struct({ refresh_token: Schema.optional(Schema.String) });

/**
 * Mints a refresh token for the canary's own Gmail grant with a one-time browser consent.
 *
 * It needs a Desktop-app OAuth client: Google accepts any loopback port as its redirect, so the
 * callback server listens on a free port and nothing has to be registered. Prints the consent URL;
 * open it while signed in as the test account.
 */
export const mintRefreshToken = ({
  clientId,
  clientSecret,
  loginHint,
}: {
  clientId: string;
  clientSecret: string;
  loginHint: string;
}): Effect.Effect<string, GmailError> =>
  Effect.tryPromise({
    try: () =>
      new Promise<string>((resolve, reject) => {
        // Set once the server is listening; the consent request and the code exchange must name the same one.
        let redirectUri = '';
        const server = createServer(async (request, response) => {
          const url = new URL(request.url ?? '/', 'http://127.0.0.1');
          const code = url.searchParams.get('code');
          if (!code) {
            response.writeHead(404).end();
            return;
          }
          response.writeHead(200, { 'content-type': 'text/plain' }).end('Authorized. Return to the terminal.');
          server.close();
          try {
            const exchange = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'content-type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              }),
            });
            const body = Schema.decodeUnknownSync(CodeExchange)(await exchange.json());
            if (!body.refresh_token) {
              throw new Error('Google returned no refresh token; revoke the app at myaccount.google.com and retry.');
            }
            resolve(body.refresh_token);
          } catch (error) {
            reject(error);
          }
        });
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          redirectUri = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/`;
          const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          consent.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: GMAIL_MODIFY_SCOPE,
            access_type: 'offline',
            prompt: 'consent',
            login_hint: loginHint,
          }).toString();
          console.error(`Open this URL signed in as ${loginHint}:\n\n${consent}\n`);
        });
      }),
    catch: (cause) => new GmailError({ message: `consent failed: ${String(cause)}` }),
  });
