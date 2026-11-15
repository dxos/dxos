//
// Copyright 2026 DXOS.org
//

import { Key } from '@dxos/echo';

/** What the URL path names: `/<spaceId>/<diagramId>` (spec F-8). */
export type Route = {
  spaceId?: string;
  drawingId?: string;
};

/** The route in a path; a segment that is not a valid id is ignored. */
export const parseRoute = (pathname: string): Route => {
  const [spaceId, drawingId] = pathname.split('/').filter(Boolean);
  if (!spaceId || !Key.SpaceId.isValid(spaceId)) {
    return {};
  }
  return drawingId && Key.EntityId.isValid(drawingId) ? { spaceId, drawingId } : { spaceId };
};

export const routePath = ({ spaceId, drawingId }: Route): string =>
  `/${[spaceId, spaceId && drawingId].filter(Boolean).join('/')}`;
