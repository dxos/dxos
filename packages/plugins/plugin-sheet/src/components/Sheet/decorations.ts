//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/echo-schema';

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
  cellIndex: string;
};

export const createDecorations = () => {
  // Reactive object to hold decorations
  // TODO(Zan): Use CELL ID's to key the decoration map.
  // TODO(Zan): Consider maintaining an index of decorations by type.
  const { decorations } = create<{ decorations: Record<string, Decoration[]> }>({ decorations: {} });

  const addDecoration = (cellIndex: string, decorator: Decoration) => {
    decorations[cellIndex] = [...(decorations[cellIndex] || []), decorator];
  };

  const removeDecoration = (cellIndex: string, type?: string) => {
    if (type) {
      decorations[cellIndex] = (decorations[cellIndex] || []).filter((d) => d.type !== type);
    } else {
      delete decorations[cellIndex];
    }
  };

  // TODO(Zan): I should check if returning the a value from a map in a deep signal is a reactive slice.
  const getDecorationsForCell = (cellIndex: string): Decoration[] | undefined => {
    return decorations[cellIndex];
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
