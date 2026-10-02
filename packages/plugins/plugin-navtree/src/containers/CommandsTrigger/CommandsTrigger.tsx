//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { COMMANDS_DIALOG, meta } from '#meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { invokePromise } = AppHooks.useOperationInvoker();
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Button.Root
      classNames='m-1 px-1 lg:px-2'
      onClick={() =>
        void invokePromise(LayoutOperation.UpdateDialog, { subject: COMMANDS_DIALOG, blockAlign: 'start' })
      }
    >
      <span className='text-description font-normal grow text-start'>{t('command-list-input.placeholder')}</span>
      <Icon.Root icon='ph--magnifying-glass--regular' />
    </Button.Root>
  );
};

CommandsTrigger.displayName = 'CommandsTrigger';
