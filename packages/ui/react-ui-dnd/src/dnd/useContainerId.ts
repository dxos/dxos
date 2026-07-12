//
// Copyright 2026 DXOS.org
//

import { useId } from 'react';

/**
 * Produce a stable, per-instance container id. Every `DndContainerHandler.id` must be unique
 * across the whole `Dnd.Root`; a bare semantic id (e.g. a Kanban column value) collides when
 * the same container mounts twice under one root. Always derive ids through this helper.
 */
export const useContainerId = (prefix: string): string => {
  const suffix = useId();
  return `${prefix}:${suffix}`;
};
