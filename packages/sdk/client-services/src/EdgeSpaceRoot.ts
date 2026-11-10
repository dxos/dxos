//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, isValidAutomergeUrl } from '@automerge/automerge-repo';

import { asyncTimeout } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

/** How long a device waits for EDGE to say whether it holds a space root. */
const EDGE_ROOT_LOOKUP_TIMEOUT = 5_000;

/**
 * What EDGE said about a space's root. `unavailable` is kept apart from `none` because only a
 * confirmed absence lets a device mint a root of its own; minting on a failed lookup could fork a
 * space EDGE has already migrated.
 */
export type EdgeSpaceRootLookup = { kind: 'found'; url: AutomergeUrl } | { kind: 'none' } | { kind: 'unavailable' };

/** Asks EDGE for the root it holds for a space. A client without EDGE configured has none to ask. */
export const lookupEdgeSpaceRoot = async (
  ctx: Context,
  edgeHttpClient: Pick<EdgeHttpClient, 'getSpaceRoot'> | undefined,
  spaceId: SpaceId,
): Promise<EdgeSpaceRootLookup> => {
  if (!edgeHttpClient) {
    return { kind: 'none' };
  }

  try {
    const { rootDocumentUrl } = await asyncTimeout(edgeHttpClient.getSpaceRoot(ctx, spaceId), EDGE_ROOT_LOOKUP_TIMEOUT);
    if (rootDocumentUrl === null) {
      return { kind: 'none' };
    }
    if (!isValidAutomergeUrl(rootDocumentUrl)) {
      log.warn('edge returned an invalid space root', { spaceId, rootDocumentUrl });
      return { kind: 'unavailable' };
    }
    return { kind: 'found', url: rootDocumentUrl };
  } catch (err) {
    log('could not read the space root from edge', { spaceId, err });
    return { kind: 'unavailable' };
  }
};
