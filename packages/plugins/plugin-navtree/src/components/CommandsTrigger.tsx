//
// Copyright 2024 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { LayoutAction, useIntent } from '@dxos/app-framework';
import { Button, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { dispatch } = useIntent();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  return (
    <Button
      classNames='w-full h-full'
      onClick={() =>
        dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands`, dialogBlockAlign: 'start' },
        })
      }
    >
      <span className='text-description font-normal grow text-start'>{t('command list input placeholder')}</span>
      <MagnifyingGlass className={getSize(5)} />
    </Button>
  );
};
