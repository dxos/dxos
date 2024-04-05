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
      classNames='pis-3 pie-2 gap-2 mli-1 mbs-1 min-bs-0 bs-[--rail-action] justify-start'
      onClick={() =>
        dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands`, dialogBlockAlign: 'start' },
        })
      }
    >
      <span className='fg-description text-base font-normal grow text-start'>{t('commandlist input placeholder')}</span>
      <MagnifyingGlass className={getSize(5)} />
    </Button>
  );
};
