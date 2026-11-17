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

/** The parameter with its value, and the `&` after it, if any; the leading `?` or `&` is kept. */
const INVITATION_PATTERN = new RegExp(`([?&])${INVITATION_PARAM}=[^&#]*&?`, 'g');

const redactUrl = (value: unknown): unknown =>
  typeof value === 'string' && value.includes(`${INVITATION_PARAM}=`)
    ? value.replace(INVITATION_PATTERN, '$1').replace(/[?&](?=#|$)/, '')
    : value;

const redactProperties = (properties?: Properties): Properties | undefined =>
  properties && Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, redactUrl(value)]));

/**
 * Removes the invitation code from every URL an event carries (`$current_url`, `$referrer`, and their `$initial_*`
 * forms in `$set_once`). The app strips it from the page URL only after the client initializes, and PostHog captures
 * before that.
 */
export const redactInvitationCodes: BeforeSendFn = (capture) =>
  capture && {
    ...capture,
    properties: redactProperties(capture.properties) ?? capture.properties,
    ...(capture.$set && { $set: redactProperties(capture.$set) }),
    ...(capture.$set_once && { $set_once: redactProperties(capture.$set_once) }),
  };
