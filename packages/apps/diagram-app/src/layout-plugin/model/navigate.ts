//
// Copyright 2026 DXOS.org
//

import { type NavigateMode, type Route, routePath, setLastDrawing, setLastSpace } from '../../shared/index.ts';

/** Remembers a route as the last one opened and writes it to the URL (spec F-8). */
export const recordRoute = (next: Route, mode: NavigateMode) => {
  if (next.spaceId) {
    setLastSpace(next.spaceId);
    if (next.drawingId) {
      setLastDrawing(next.spaceId, next.drawingId);
    }
  }
  const path = routePath(next);
  if (path !== window.location.pathname) {
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', path + window.location.search);
  }
};
