//
// Copyright 2026 DXOS.org
//

/** A share link's payload in a URL or query string; it can carry a space invitation, so it must not leave the tab. */
const SHARE_VALUE = /([?&]share=)[^&#\s"']*/g;

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
    return value.includes('share=') ? value.replace(SHARE_VALUE, '$1') : value;
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
