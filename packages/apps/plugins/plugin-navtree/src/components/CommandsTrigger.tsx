//
// Copyright 2024 DXOS.org
//

import { Terminal } from '@phosphor-icons/react';
import React from 'react';

import { LayoutAction, useIntent } from '@dxos/app-framework';
import { Button, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

export const CommandsTrigger = () => {
  const { dispatch } = useIntent();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  return (
    <Button
      classNames='pli-2 gap-2 m-2 min-bs-0 bs-[calc(var(--rail-action)-.5rem)] rounded-sm justify-start'
      onClick={() =>
        dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands` },
        })
      }
    >
      <Terminal className={getSize(5)} />
      <span className='fg-description'>{t('commandlist input placeholder')}</span>
    </Button>
  );
};
