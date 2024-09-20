//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/echo-schema';

import { type CellAddress } from '../../model';

export type Decoration = {
  type: string;
  /**
   * A wrapping render function to encapsulate cell content. This function is applied between
   * the cell's border and its padding/layout/content, allowing for custom rendering or
   * additional elements to be inserted around the cell's main content.
   */
  decorate?: (props: { children: React.ReactNode }) => React.ReactNode;
  /**
   * An array of CSS class names to be applied to the content of the SheetCell.
   * These classes can be used to style the cell's content independently of its structure.
   */
  classNames?: string[];
  cellAddress: CellAddress;
};

export const createDecorations = () => {
  // Reactive object to hold decorations
  // TODO(Zan): Use CELL ID's to key the decoration map
  // TODO(Zan): Consider indexing decorations by type instead of by location for efficiency.
  const { decorations } = create<{ decorations: Record<string, Decoration[]> }>({ decorations: {} });

  const addDecoration = (cellAddress: CellAddress, decorator: Decoration) => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    decorations[key] = [...(decorations[key] || []), decorator];
  };

  const removeDecoration = (cellAddress: CellAddress, type?: string) => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    if (type) {
      decorations[key] = (decorations[key] || []).filter((d) => d.type !== type);
    } else {
      delete decorations[key];
    }
  };

  // TODO(Zan): I should check if returning the a value from a map in a deep signal is a reactive slice.
  const getDecorationsForCell = (cellAddress: CellAddress): Decoration[] | undefined => {
    const key = `${cellAddress.column},${cellAddress.row}`;
    return decorations[key];
  };

  const getAllDecorations = (): Decoration[] => {
    const result: Decoration[] = [];
    for (const decoratorArray of Object.values(decorations)) {
      for (const decorator of decoratorArray) {
        result.push(decorator);
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
