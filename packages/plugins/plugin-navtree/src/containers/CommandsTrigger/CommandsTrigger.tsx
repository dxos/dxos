//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { COMMANDS_DIALOG, meta } from '#meta';

// TODO(thure): Refactor to be handled by a more appropriate plugin.
export const CommandsTrigger = () => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Button.Button
      classNames='m-1 px-1 lg:px-2'
      onClick={() =>
        void invokePromise(LayoutOperation.UpdateDialog, { subject: COMMANDS_DIALOG, blockAlign: 'start' })
      }
    >
      <span className='text-fg-muted font-normal grow text-start'>{t('command-list-input.placeholder')}</span>
      <Icon.Icon icon='ph--magnifying-glass--regular' />
    </Button.Button>
  );
};

CommandsTrigger.displayName = 'CommandsTrigger';
