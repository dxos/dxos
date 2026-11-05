//
// Copyright 2026 DXOS.org
//

/** An object share link's payload; the same name as plugin-space's `SpaceOperation.SHARE_PARAM`, which boot does not import. */
export const PARAM_SHARE = 'share';

/** Where boot keeps a share link's payload; plugin-space's `SpaceOperation.SHARE_STORAGE_KEY`. */
export const SHARE_STORAGE_KEY = 'dxos.share';

/**
 * Moves a share link's payload out of the URL's fragment into this tab's session storage, where its readers find it, a
 * reload keeps it, and no request or `Referer` carries the invitation it may hold.
 * @returns The path, query and fragment to show once the payload is out; undefined for a URL whose fragment carries none.
 */
export const stashShareFragment = (href: string, storage: Pick<Storage, 'setItem'>): string | undefined => {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const payload = fragment.get(PARAM_SHARE);
  if (!payload) {
    return undefined;
  }
  fragment.delete(PARAM_SHARE);
  try {
    storage.setItem(SHARE_STORAGE_KEY, payload);
  } catch {
    // Without storage the link still has to open, so its readers find the payload in the query.
    url.searchParams.set(PARAM_SHARE, payload);
  }
  url.hash = fragment.toString();
  return `${url.pathname}${url.search}${url.hash}`;
};

/** The share payload boot stashed; null when there is none or storage is unavailable. */
export const readStashedShare = (storage: Pick<Storage, 'getItem'>): string | null => {
  try {
    return storage.getItem(SHARE_STORAGE_KEY);
  } catch {
    return null;
  }
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
