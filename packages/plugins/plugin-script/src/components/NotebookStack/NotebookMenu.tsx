//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Menu, useTranslation } from '@dxos/react-ui';

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
    <Menu.Portal>
      <Menu.Content>
        <Menu.Viewport>
          <Menu.Item onClick={() => onCellInsert?.('script', cell?.id)}>
            {t('notebook-cell-insert-script.label')}
          </Menu.Item>
          <Menu.Item onClick={() => onCellInsert?.('prompt', cell?.id)}>
            {t('notebook-cell-insert-prompt.label')}
          </Menu.Item>
          <Menu.Item onClick={() => onCellInsert?.('query', cell?.id)}>
            {t('notebook-cell-insert-query.label')}
          </Menu.Item>
          <Menu.Item onClick={() => onCellInsert?.('markdown', cell?.id)}>
            {t('notebook-cell-insert-markdown.label')}
          </Menu.Item>
          {cell && onCellDelete && (
            <Menu.Item onClick={() => onCellDelete?.(cell.id)}>{t('notebook-cell-delete.label')}</Menu.Item>
          )}
        </Menu.Viewport>
        <Menu.Arrow />
      </Menu.Content>
    </Menu.Portal>
  );
};
