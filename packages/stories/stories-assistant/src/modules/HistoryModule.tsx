//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ModuleProps } from '@dxos/story-modules';

import { useCurrentObject } from '../testing';

/**
 * Renders the current document's history companion — plugin-space's version timeline (checkpoints,
 * branch forks, merges). Selecting a version time-travels the document's other surfaces (the editor
 * in {@link DocumentModule}) via the shared versioning state.
 */
export const HistoryModule = ({ space }: ModuleProps) => {
  const object = useCurrentObject(space);
  const attendableId = object ? Paths.getCollectionsPath(space.id, object.id) : undefined;
  const data = useMemo(() => ({ attendableId, subject: 'history', companionTo: object }), [attendableId, object]);
  if (!object) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={data} />;
};
