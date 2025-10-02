//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';

import { useProject } from './Project';

const addColumnItem = { id: 'addItem' };

export const AddColumn = () => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = useProject('AddColumn');

  return (
    <StackItem.Root item={addColumnItem} size={12} focusIndicatorVariant='group'>
      <IconButton
        label={t('add column label')}
        icon='ph--plus--regular'
        onClick={onAddColumn}
        classNames='place-self-center is-min'
      />
    </StackItem.Root>
  );
};
