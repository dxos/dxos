//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { useSheetContext } from './sheet-context';
import { type CellAddress } from '../../model';

// TODO(Zan): The anchor should be a cell ID so that it's durable when
// cells are moved around.
export const Anchor = {
  ofCellAddress: (location: CellAddress): string => `${location.row}:${location.column}`,
  toCellAddress: (anchor: string): CellAddress => {
    const [row, column] = anchor.split(':');
    return { row: parseInt(row), column: parseInt(column) };
  },
};

export const useThreads = () => {
  const { decorations, model } = useSheetContext();
  const sheet = model.sheet;

  effect(() => {
    const activeThreadAnchors = new Set<string>();

    // Process active threads
    for (const thread of sheet.threads) {
      if (!thread || !thread.anchor || thread.status === 'resolved') {
        continue;
      }

      const cellAddress = Anchor.toCellAddress(thread.anchor);
      const key = Anchor.ofCellAddress(cellAddress);
      activeThreadAnchors.add(key);

      // Add decoration only if it doesn't already exist
      const existingDecorations = decorations.getDecorationsForCell(cellAddress);
      if (!existingDecorations || !existingDecorations.some((d) => d.type === 'comment')) {
        decorations.addDecoration(cellAddress, {
          type: 'comment',
          data: { threadId: thread.id },
        });
      }
    }

    // Remove decorations for resolved or deleted threads
    for (const decoration of decorations.getAllDecorations()) {
      if (decoration.type !== 'comment') {
        continue;
      }

      const cellAddress = decoration.cellAddress;
      const key = Anchor.ofCellAddress(cellAddress);

      if (!activeThreadAnchors.has(key)) {
        decorations.removeDecoration(cellAddress, 'comment');
      }
    }
  });
};
