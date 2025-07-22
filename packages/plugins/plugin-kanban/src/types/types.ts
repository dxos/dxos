//
// Copyright 2025 DXOS.org
//

import { KanbanType } from '@dxos/react-ui-kanban';

export type Location = {
  idx?: number;
};

/**
 * @deprecated
 */
// TODO(burdon): Remove?
export interface KanbanModel {
  root: KanbanType;
}

/**
 * @deprecated Use Type.isInstance()
 */
export const isKanban = (object: unknown): object is KanbanType => object != null && object instanceof KanbanType;
