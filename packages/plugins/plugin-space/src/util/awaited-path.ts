//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { EntityId, SpaceId } from '@dxos/keys';

export type AwaitedTarget = { spaceId: SpaceId; objectId?: EntityId };

/**
 * What a missing deck path is waiting on: its space, when the path is the space's workspace, or the
 * object its last segment names. Other paths (sections, settings pages) are not awaited.
 */
export const getAwaitedTarget = (path: string): AwaitedTarget | undefined => {
  const spaceId = GraphPath.getWorkspaceToken(path);
  if (!spaceId || !SpaceId.isValid(spaceId)) {
    return undefined;
  }
  if (path === GraphPath.getSpacePath(spaceId)) {
    return { spaceId };
  }
  const objectId = path.split('/').at(-1);
  return objectId && EntityId.isValid(objectId) ? { spaceId, objectId } : undefined;
};
