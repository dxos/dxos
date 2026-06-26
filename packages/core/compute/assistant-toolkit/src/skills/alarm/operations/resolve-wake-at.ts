//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Either from 'effect/Either';

interface ResolveAlarmInput {
  /** Duration from now, e.g. `'30 seconds'`, `'5 minutes'`, `'1 hour'`. */
  in?: string;
  /** Absolute ISO-8601 timestamp, e.g. `'2026-06-04T18:00:00.000Z'`. */
  at?: string;
}

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s+(\S+)$/;

/**
 * Resolves an alarm specification into an absolute UNIX timestamp (ms).
 * Returns a {@link Either.left} with a human-readable message describing invalid input.
 */
export const resolveWakeAt = (input: ResolveAlarmInput, now: number): Either.Either<number, string> => {
  const { in: inDuration, at } = input;
  if (inDuration != null && at != null) {
    return Either.left('Specify either "in" or "at", not both.');
  }
  if (at != null) {
    const timestamp = new Date(at).getTime();
    if (Number.isNaN(timestamp)) {
      return Either.left(`Invalid "at" timestamp: "${at}". Provide an ISO-8601 date-time string.`);
    }
    return Either.right(timestamp);
  }
  if (inDuration != null) {
    const match = inDuration.trim().match(DURATION_PATTERN);
    if (!match) {
      return Either.left(`Invalid "in" duration: "${inDuration}". Use a value like "30 seconds" or "5 minutes".`);
    }
    try {
      return Either.right(now + Duration.toMillis(Duration.decode(`${match[1]} ${match[2]}`)));
    } catch {
      return Either.left(`Invalid "in" duration: "${inDuration}". Use a value like "30 seconds" or "5 minutes".`);
    }
  }
  return Either.left('Specify either "in" (a duration from now) or "at" (an absolute time).');
};
