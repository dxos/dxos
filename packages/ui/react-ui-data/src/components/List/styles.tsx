//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

// TODO(burdon): Factor out?
export type BaseItem = { id: string };

export type ItemState =
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null;
    };

export const idle: ItemState = { type: 'idle' };
