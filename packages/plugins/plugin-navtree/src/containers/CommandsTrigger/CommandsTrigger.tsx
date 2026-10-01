//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Next, useTranslation } from '@dxos/react-ui';

import { COMMANDS_DIALOG, meta } from '#meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  return (
    <Next.Button
      classNames='m-1 px-1 lg:px-2'
      onClick={() =>
        void invokePromise(LayoutOperation.UpdateDialog, { subject: COMMANDS_DIALOG, blockAlign: 'start' })
      }
    >
      <span className='text-description font-normal grow text-start'>{t('command-list-input.placeholder')}</span>
      <Next.Icon icon='ph--magnifying-glass--regular' />
    </Next.Button>
  );
};

CommandsTrigger.displayName = 'CommandsTrigger';
