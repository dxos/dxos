//
// Copyright 2026 DXOS.org
//

import { type BeforeSendFn, type Properties } from 'posthog-js';

/**
 * Browser-raised errors with no stack and no effect on the user: a ResizeObserver callback that resized an element
 * mid-delivery is reported this way, and the browser delivers the skipped notifications on the next frame.
 */
const BENIGN_EXCEPTIONS = [/^ResizeObserver loop/];

/** Drops `$exception` events whose every exception is benign. */
export const dropBenignExceptions: BeforeSendFn = (capture) => {
  if (capture?.event !== '$exception') {
    return capture;
  }

  const exceptions: { value?: unknown }[] = capture.properties.$exception_list ?? [];
  const benign =
    exceptions.length > 0 &&
    exceptions.every(
      ({ value }) => typeof value === 'string' && BENIGN_EXCEPTIONS.some((pattern) => pattern.test(value)),
    );
  return benign ? null : capture;
};

/** A space invitation link's query parameter; the code in it lets anyone join the space. */
const INVITATION_PARAM = 'spaceInvitationCode';

/**
 * The URL without the invitation parameter, decoded and matched the way the app reads it (`URLSearchParams`), so an
 * encoded name or a repeat is removed too. Anything that is not an absolute URL with a query is returned as it was.
 */
const redactUrl = (value: string): string => {
  if (!value.includes('?')) {
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (!url.searchParams.has(INVITATION_PARAM)) {
    return value;
  }
  url.searchParams.delete(INVITATION_PARAM);
  return url.toString();
};

/** Redacts every string in a property value, including person properties nested as `properties.$set`. */
const redactValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return redactUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value !== null && typeof value === 'object') {
    return redactProperties(value);
  }
  return value;
};

const redactProperties = (properties: object): Properties =>
  Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, redactValue(value)]));

/**
 * Removes the invitation code from every URL an event carries (`$current_url`, `$referrer`, and their `$initial_*`
 * forms in `$set` and `$set_once`). The app strips it from the page URL only after the client initializes, and
 * PostHog captures before that.
 */
export const redactInvitationCodes: BeforeSendFn = (capture) =>
  capture && {
    ...capture,
    properties: redactProperties(capture.properties),
    ...(capture.$set && { $set: redactProperties(capture.$set) }),
    ...(capture.$set_once && { $set_once: redactProperties(capture.$set_once) }),
  };
