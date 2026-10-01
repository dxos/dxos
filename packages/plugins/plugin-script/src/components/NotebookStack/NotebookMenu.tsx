//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { Notebook } from '#types';

export type NotebookMenuProps = {
  cell?: Notebook.Cell;
  onCellInsert?: (type: Notebook.CellType, after: string | undefined) => void;
  onCellDelete?: (id: string) => void;
};

// TODO(burdon): Better way to organize menu?
export const NotebookMenu = ({ cell, onCellInsert, onCellDelete }: NotebookMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Next.Menu.Content>
      <Next.Menu.Item
        onClick={() => onCellInsert?.('script', cell?.id)}
        item={{ value: t('notebook-cell-insert-script.label'), label: t('notebook-cell-insert-script.label') }}
      />
      <Next.Menu.Item
        onClick={() => onCellInsert?.('prompt', cell?.id)}
        item={{ value: t('notebook-cell-insert-prompt.label'), label: t('notebook-cell-insert-prompt.label') }}
      />
      <Next.Menu.Item
        onClick={() => onCellInsert?.('query', cell?.id)}
        item={{ value: t('notebook-cell-insert-query.label'), label: t('notebook-cell-insert-query.label') }}
      />
      <Next.Menu.Item
        onClick={() => onCellInsert?.('markdown', cell?.id)}
        item={{ value: t('notebook-cell-insert-markdown.label'), label: t('notebook-cell-insert-markdown.label') }}
      />
      {cell && onCellDelete && (
        <Next.Menu.Item
          onClick={() => onCellDelete?.(cell.id)}
          item={{ value: t('notebook-cell-delete.label'), label: t('notebook-cell-delete.label') }}
        />
      )}
    </Next.Menu.Content>
  );
};
