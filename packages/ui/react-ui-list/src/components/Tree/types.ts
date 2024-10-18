//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';

import { S } from '@dxos/echo-schema';

export const ItemSchema = S.Struct({
  id: S.String,
  name: S.String,
  icon: S.optional(S.String),
  path: S.Array(S.String),
  parentOf: S.optional(S.Array(S.String)),
});

export type ItemType = S.Schema.Type<typeof ItemSchema>;

export const isItem: (item: unknown) => boolean = S.is(ItemSchema);

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
