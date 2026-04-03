//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Notebook } from '../../types';

export type NotebookMenuProps = {
  cell?: Notebook.Cell;
  onCellInsert?: (type: Notebook.CellType, after: string | undefined) => void;
  onCellDelete?: (id: string) => void;
};

// TODO(burdon): Better way to organize menu?
export const NotebookMenu = ({ cell, onCellInsert, onCellDelete }: NotebookMenuProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content>
        <DropdownMenu.Viewport>
          <DropdownMenu.Item onClick={() => onCellInsert?.('script', cell?.id)}>
            {t('notebook cell insert script label')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onCellInsert?.('prompt', cell?.id)}>
            {t('notebook cell insert prompt label')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onCellInsert?.('query', cell?.id)}>
            {t('notebook cell insert query label')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onCellInsert?.('markdown', cell?.id)}>
            {t('notebook cell insert markdown label')}
          </DropdownMenu.Item>
          {cell && onCellDelete && (
            <DropdownMenu.Item onClick={() => onCellDelete?.(cell.id)}>
              {t('notebook cell delete label')}
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Viewport>
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
};
