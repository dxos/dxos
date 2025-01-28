//
// Copyright 2024 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { Button, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  return (
    <Button
      classNames='m-1 !pli-1 lg:!pli-2'
      onClick={() =>
        dispatch(
          createIntent(LayoutAction.SetLayout, {
            element: 'dialog',
            component: COMMANDS_DIALOG,
            dialogBlockAlign: 'start',
          }),
        )
      }
    >
      <span className='text-description font-normal grow text-start'>{t('command list input placeholder')}</span>
      <MagnifyingGlass className={getSize(5)} />
    </Button>
  );
};
