//
// Copyright 2026 DXOS.org
//

/**
 * Personal space tag, defined here (protocol layer) rather than in the client app-toolkit so that
 * the server (Edge) can reference it without depending on client packages — e.g. to detect a user's
 * personal space when evaluating notification rules. (App-level tags such as the exemplar space
 * remain in `@dxos/app-toolkit`.)
 */

/** Space tag for the personal space. */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Check whether a list of space tags includes the given tag. */
export const hasSpaceTag = (tags: readonly string[] | undefined, tag: string): boolean =>
  !!tags && tags.includes(tag);
