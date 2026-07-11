//
// Copyright 2026 DXOS.org
//

// Local-loopback Google OAuth tool. First run opens the browser for a one-time consent, then saves
// the refresh token to fixtures/local/.google-token.json (git-ignored) and mints access tokens from
// it on every subsequent run — no further browser interaction.
//
// One-time setup — create a Desktop-app OAuth client (Google Cloud Console, https://console.cloud.google.com):
//   1. Create or select a project (top-left project picker).
//   2. Enable the Gmail API: APIs & Services → Library → search "Gmail API" → Enable.
//      Or via the CLI (also avoids the console's "insufficient permissions to check enablement" hiccup):
//        gcloud services enable gmail.googleapis.com --project <PROJECT_ID>
//   3. Configure the consent screen: APIs & Services → OAuth consent screen → User type "External" →
//      fill app name + your email. Add the scope ".../auth/gmail.readonly". Under "Test users", add
//      your own Google account (while the app stays in "Testing", only test users may consent).
//   4. Create the client: APIs & Services → Credentials → Create credentials → OAuth client ID →
//      Application type "Desktop app". (A Desktop client trusts the http://localhost loopback
//      redirect automatically — no redirect URI to register.) Copy the Client ID + Client secret.
//   5. Provide the client id + secret. Easiest: a `.env.tpl` (git-ignored) with 1Password references,
//      auto-loaded via `op inject` on run — nothing lands in your shell history/rc:
//        # packages/stories/stories-brain/.env.tpl
//        export GOOGLE_CLIENT_ID=op://DXOS/google.console.dxos-testing/GOOGLE_CLIENT_ID
//        export GOOGLE_CLIENT_SECRET=op://DXOS/google.console.dxos-testing/credential
//      Alternatively export the raw values, or export them as `op://…` refs (resolved with `op read`).
//
// Usage:
//   node scripts/google-auth.mjs            # ensure a refresh token (consent if needed), print status
//   node scripts/google-auth.mjs --token    # print a fresh access token to stdout (for piping)
//   node scripts/google-auth.mjs --force    # re-consent even if a refresh token exists

import { exec, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const REDIRECT_PORT = 4180;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const TOKEN_PATH = resolve(PACKAGE_ROOT, 'fixtures/local/.google-token.json');
const ENV_TEMPLATE = resolve(PACKAGE_ROOT, '.env.tpl');

/**
 * Populates process.env from `.env.tpl` (git-ignored) by rendering its 1Password references with
 * `op inject`. Existing env values win, so an explicit export overrides the template. A no-op when the
 * template is absent or the `op` CLI is unavailable — the raw-env / op:// paths still apply.
 */
const loadEnvTemplate = () => {
  if (!existsSync(ENV_TEMPLATE)) {
    return;
  }
  let rendered;
  try {
    rendered = execFileSync('op', ['inject', '-i', ENV_TEMPLATE], { encoding: 'utf8' });
  } catch {
    return;
  }
  for (const line of rendered.split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
};

/** Resolves a value that may be a 1Password secret reference (`op://…`) via the `op` CLI. */
const resolveSecret = (value) => {
  if (!value?.startsWith('op://')) {
    return value;
  }
  try {
    return execFileSync('op', ['read', value], { encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error(
      `failed to read ${value} from 1Password — is the \`op\` CLI installed and signed in? (${err.message})`,
    );
  }
};

// Resolved lazily (inside getAccessToken) so `op` only runs when the tool is actually used.
let clientId;
let clientSecret;

const die = (message) => {
  console.error(`error: ${message}`);
  process.exit(1);
};

const openBrowser = (url) => {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${url}"`);
};

const saveToken = (data) => {
  mkdirSync(dirname(TOKEN_PATH), { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));
};

const loadToken = () => (existsSync(TOKEN_PATH) ? JSON.parse(readFileSync(TOKEN_PATH, 'utf8')) : undefined);

/** Runs the one-time consent via a local loopback server; resolves with the token response. */
const consent = () =>
  new Promise((resolvePromise, reject) => {
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
      });

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<h3>Authorized. You can close this tab and return to the terminal.</h3>');
      server.close();
      if (!code) {
        reject(new Error(`no auth code (${url.searchParams.get('error') ?? 'unknown'})`));
        return;
      }
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });
        const json = await response.json();
        if (!response.ok) {
          reject(new Error(`token exchange failed: ${JSON.stringify(json)}`));
          return;
        }
        resolvePromise(json);
      } catch (err) {
        reject(err);
      }
    });
    server.listen(REDIRECT_PORT, () => {
      console.error(`Opening browser for consent (listening on ${REDIRECT_URI}) …`);
      openBrowser(authUrl);
    });
  });

/** Exchanges the saved refresh token for a fresh access token. */
const refreshAccessToken = async (refreshToken) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`token refresh failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
};

/** Ensures a refresh token exists (consenting if needed) and returns a fresh access token. */
export const getAccessToken = async ({ force = false } = {}) => {
  loadEnvTemplate();
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    die('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set (via .env.tpl, raw, or op:// refs; see the header).');
  }
  clientId = resolveSecret(process.env.GOOGLE_CLIENT_ID);
  clientSecret = resolveSecret(process.env.GOOGLE_CLIENT_SECRET);
  let saved = force ? undefined : loadToken();
  if (!saved?.refresh_token) {
    const tokens = await consent();
    if (!tokens.refresh_token) {
      die('no refresh_token returned — revoke prior access at myaccount.google.com and retry with --force.');
    }
    saved = tokens;
    saveToken(tokens);
    console.error(`Saved refresh token to ${TOKEN_PATH}`);
  }
  return refreshAccessToken(saved.refresh_token);
};

// CLI entry (skipped when imported by fetch-fixture.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  const printToken = process.argv.includes('--token');
  const token = await getAccessToken({ force });
  if (printToken) {
    process.stdout.write(token);
  } else {
    console.error('OK — access token acquired (use --token to print it for piping).');
  }
}
