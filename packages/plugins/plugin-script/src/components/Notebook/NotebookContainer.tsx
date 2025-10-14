//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../../meta';
import { type Notebook } from '../../types';

import { NotebookStack } from './NotebookStack';

export type NotebookContainerProps = {
  notebook?: Notebook.Notebook;
};

export const NotebookContainer = ({ notebook }: NotebookContainerProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add cell label')} />
      </Toolbar.Root>
      <NotebookStack notebook={notebook} />
    </StackItem.Content>
  );
};
