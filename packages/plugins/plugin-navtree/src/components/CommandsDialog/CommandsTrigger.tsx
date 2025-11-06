//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Button, Icon, useTranslation } from '@dxos/react-ui';

import { COMMANDS_DIALOG, meta } from '../../meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(meta.id);
  return (
    <Button
      classNames='m-1 pli-1 lg:pli-2'
      onClick={() =>
        dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            subject: COMMANDS_DIALOG,
            options: {
              blockAlign: 'start',
            },
          }),
        )
      }
    >
      <span className='text-description font-normal grow text-start'>{t('command list input placeholder')}</span>
      <Icon icon='ph--magnifying-glass--regular' size={5} />
    </Button>
  );
};
