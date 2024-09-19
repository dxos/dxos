//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/echo-schema';

import { type CellAddress } from '../../model';

// NOTE(Zan): We should allow this to be extended in the future.
export type Decoration = {
  cellAddress: CellAddress;
  type: 'comment'; // This can be extended as a union in the future.
  data?: any;
};

export const createDecorations = () => {
  // Reactive object to hold decorations
  // TODO(Zan): Use CELL ID's to key the decoration map
  const { decorations } = create<{ decorations: Record<string, Decoration[]> }>({ decorations: {} });

  const addDecoration = (cellAddress: CellAddress, decoration: Omit<Decoration, 'cellAddress'>) => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    decorations[key] = [...(decorations[key] || []), { ...decoration, cellAddress }];
  };

  const removeDecoration = (cellAddress: CellAddress, type?: string) => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    if (type) {
      decorations[key] = (decorations[key] || []).filter((d) => d.type !== type);
    } else {
      delete decorations[key];
    }
  };

  // TODO(Zan): Once we have `computed(() => decorations[...])` this could be
  // a lot more efficient.
  const getDecorationsForCell = (cellAddress: CellAddress): Decoration[] | undefined => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    return decorations[key];
  };

  const getAllDecorations = (): Decoration[] => {
    const result: Decoration[] = [];
    for (const decorationArray of Object.values(decorations)) {
      for (const decoration of decorationArray) {
        result.push(decoration);
      }
    }
    return result;
  };

  return {
    addDecoration,
    removeDecoration,
    getDecorationsForCell,
    getAllDecorations,
  } as const;
};
