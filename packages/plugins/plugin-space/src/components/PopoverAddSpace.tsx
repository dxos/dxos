//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction } from '../types';

export const POPOVER_ADD_SPACE = `${SPACE_PLUGIN}/PopoverRenameSpace`;

export const PopoverAddSpace = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  return (
    <div role='none' className='grid grid-cols-1 gap-1 [&>button]:justify-start'>
      <IconButton
        variant='ghost'
        label={t('join space label')}
        icon='ph--sign-in--regular'
        onClick={() => dispatch(createIntent(SpaceAction.Join))}
        data-testid='spacePlugin.joinSpace'
      />
      <IconButton
        variant='ghost'
        label={t('create space label')}
        icon='ph--plus--regular'
        onClick={() => dispatch(createIntent(SpaceAction.OpenCreateSpace))}
        data-testid='spacePlugin.createSpace'
      />
    </div>
  );
};
