//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves credentials for the live Gmail tests from the repo-root `.secrets/` directory, minting a
 * fresh access token from the stored refresh token.
 *
 * Deliberately NOT gated on `GOOGLE_ACCESS_TOKEN`: that variable already arms the read-only
 * `sync-e2e.test.ts`, so reusing it would silently turn an existing read-only setup into one that
 * writes to a real mailbox. Absent credentials mean the live suite skips.
 *
 * See `src/operations/mail/sync/TESTING.md` for how to create the two files.
 */

/** Repo root, found by walking up from this file until `.secrets`'s parent (the workspace root) shows. */
const repoRoot = (): string => {
  let dir = new URL('../../', import.meta.url).pathname;
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = join(dir, '..');
  }
  return dir;
};

const SECRETS_DIR = join(repoRoot(), '.secrets');

type ClientSecret = { readonly client_id: string; readonly client_secret: string };

const readClientSecret = (): ClientSecret | undefined => {
  if (!existsSync(SECRETS_DIR)) {
    return undefined;
  }
  const file = readdirSync(SECRETS_DIR).find((name) => name.startsWith('client_secret_') && name.endsWith('.json'));
  if (!file) {
    return undefined;
  }
  const parsed = JSON.parse(readFileSync(join(SECRETS_DIR, file), 'utf8'));
  // Google exports the client under a `web` or `installed` key depending on the client type.
  const client = parsed.web ?? parsed.installed ?? parsed;
  return client?.client_id && client?.client_secret
    ? { client_id: client.client_id, client_secret: client.client_secret }
    : undefined;
};

const readToken = (): { readonly refresh_token?: string } | undefined => {
  const path = join(SECRETS_DIR, 'gmail.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
};

/** Whether the live suite has what it needs; used as the `describe.runIf` gate. */
export const hasLiveGmailCredentials = (): boolean => {
  try {
    return readClientSecret() !== undefined && readToken()?.refresh_token !== undefined;
  } catch {
    return false;
  }
};

/**
 * Mints a fresh access token from the stored refresh token.
 *
 * Uses `curl` rather than `fetch` so the call is identical whichever runtime the suite runs under and
 * needs no HTTP client wiring; it is test-only setup, not production code.
 */
export const liveGmailAccessToken = (): string => {
  const client = readClientSecret();
  const token = readToken();
  if (!client || !token?.refresh_token) {
    throw new Error(`live Gmail credentials missing from ${SECRETS_DIR} — see sync/TESTING.md`);
  }
  const response = execFileSync(
    'curl',
    [
      '-s',
      'https://oauth2.googleapis.com/token',
      '-d',
      `client_id=${client.client_id}`,
      '-d',
      `client_secret=${client.client_secret}`,
      '-d',
      `refresh_token=${token.refresh_token}`,
      '-d',
      'grant_type=refresh_token',
    ],
    { encoding: 'utf8' },
  );
  const parsed = JSON.parse(response);
  if (!parsed.access_token) {
    throw new Error(`refresh failed: ${parsed.error_description ?? parsed.error ?? 'unknown'}`);
  }
  return parsed.access_token;
};

/**
 * The account the live suite is allowed to write to. The test asserts the token actually points here
 * before its first write and FAILS on mismatch rather than skipping, so a mis-pointed token is loud
 * rather than quietly mutating the wrong mailbox.
 */
export const LIVE_GMAIL_ACCOUNT = 'test@braneframe.com';
