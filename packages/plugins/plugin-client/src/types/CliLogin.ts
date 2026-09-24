//
// Copyright 2026 DXOS.org
//

/**
 * Contract between `dx account login --method composer` and the Composer page that approves it.
 *
 * The CLI opens `<composer>/?cliLogin=<callback>&cliLoginState=<state>`; once the user approves,
 * Composer creates a device invitation and hands its code to `<callback>?invitationCode=…&state=…`.
 * Both sides import this module so the parameter names cannot drift apart.
 */

/** Query param carrying the CLI's loopback callback URL. */
export const CALLBACK_PARAM = 'cliLogin';

/** Query param carrying the CLI's one-time state, shown on both sides so the user can match them. */
export const STATE_PARAM = 'cliLoginState';

/** Callback query params written by Composer. */
export const INVITATION_CODE_PARAM = 'invitationCode';
export const RESPONSE_STATE_PARAM = 'state';

/** Path the CLI's loopback server answers on. */
export const CALLBACK_PATH = '/cli-login';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Parses a callback URL, accepting only plain-HTTP loopback targets.
 *
 * The invitation code is a bearer credential for the identity, so it may only ever be delivered to
 * this machine: a link crafted by someone else then admits nothing, because the victim's own
 * loopback port has nobody listening for it (the same rule the hub applies to passkey callbacks).
 */
export const parseCallback = (value: string | null | undefined): URL | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) && url.pathname === CALLBACK_PATH
      ? url
      : undefined;
  } catch {
    return undefined;
  }
};

/** The state is short and human-comparable, so it doubles as the code the user matches by eye. */
export const isValidState = (value: string | null | undefined): value is string =>
  !!value && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value);

const STATE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a state token in the `XXXX-XXXX` form {@link isValidState} accepts. */
export const createState = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (byte) => STATE_ALPHABET[byte % STATE_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
};

/** URL the CLI opens: Composer's origin with the callback and state attached. */
export const createAuthorizeUrl = (composerUrl: string, callback: string, state: string): URL => {
  const url = new URL(composerUrl);
  url.searchParams.set(CALLBACK_PARAM, callback);
  url.searchParams.set(STATE_PARAM, state);
  return url;
};

/** URL Composer calls back on, carrying the invitation code and echoing the state. */
export const createCallbackUrl = (callback: URL, invitationCode: string, state: string): URL => {
  const url = new URL(callback);
  url.searchParams.set(INVITATION_CODE_PARAM, invitationCode);
  url.searchParams.set(RESPONSE_STATE_PARAM, state);
  return url;
};
