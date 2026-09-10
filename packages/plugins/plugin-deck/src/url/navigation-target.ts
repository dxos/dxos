//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { EntityId } from '@dxos/keys';

/**
 * Every ECHO object id a URL pair's `id` field could be referring to, in the order they appear.
 *
 * Which `+`-joined segment holds the object id is extension-specific — `<objectId>+<view>` for a
 * mailbox's filter views, `<typeSlug>+<objectId>` for a database object — and the position is
 * declared nowhere, so no single index is correct. A `SpaceId` cannot be mistaken for an object id
 * (33-char multibase vs 26-char ULID).
 */
export const getCandidateEntityIds = (pairId: string, tailSeparator: string): string[] =>
  pairId.split(tailSeparator).filter((segment) => EntityId.isValid(segment));

/** The plank id for a pair no extension could resolve. */
export const getUnresolvedPlankId = (pair: UrlPath.Pair): string =>
  [GraphPath.getSpacePath(pair.workspace), pair.key, pair.id].filter((segment) => segment !== undefined).join('/');
