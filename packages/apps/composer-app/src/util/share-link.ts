//
// Copyright 2026 DXOS.org
//

/** An object share link's payload; the same name as plugin-space's `SpaceOperation.SHARE_PARAM`, which boot does not import. */
export const PARAM_SHARE = 'share';

/**
 * The path, query and fragment to show for `href` once a share link's payload moves from its fragment, which a browser
 * never sends to a server, into the query the app reads it from; undefined for a URL whose fragment carries none.
 */
export const liftShareFragment = (href: string): string | undefined => {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const payload = fragment.get(PARAM_SHARE);
  if (!payload) {
    return undefined;
  }
  fragment.delete(PARAM_SHARE);
  url.searchParams.set(PARAM_SHARE, payload);
  url.hash = fragment.toString();
  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * A share link's payload in a URL, its query or its fragment; it can carry a space invitation, so it must not leave the tab. Each
 * letter of the name may be percent-encoded, as `URLSearchParams` still reads `s%68are` as `share`.
 */
const SHARE_VALUE = /([?&#](?:s|%73)(?:h|%68)(?:a|%61)(?:r|%72)(?:e|%65)=)[^&#\s"']*/gi;

/**
 * Empties a share link's payload in every string an analytics event holds — the page URL, the initial URL PostHog
 * persists, a session replay's page metadata — since anyone holding an "Anyone with the link" payload can join its
 * space. Mutates and returns the event, as a PostHog `before_send` hook does.
 */
export const redactSharePayload = <T extends object>(event: T | null): T | null => {
  if (event) {
    redact(event);
  }
  return event;
};

const redact = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace(SHARE_VALUE, '$1');
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = redact(item);
    });
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      Reflect.set(value, key, redact(child));
    }
  }
  return value;
};
