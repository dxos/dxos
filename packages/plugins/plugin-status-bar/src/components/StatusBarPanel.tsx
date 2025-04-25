//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';

import { StatusBar } from './StatusBar';
import { VersionNumber } from './VersionNumber';
import { STATUS_BAR_PLUGIN } from '../meta';

export const StatusBarActions = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* TODO(zan): Configure this label? */}
      <StatusBar.Button asChild>
        <a href='https://dxos.org/discord' target='_blank' rel='noopener noreferrer'>
          <Icon icon='ph--discord-logo--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>{t('discord label')}</StatusBar.Text>
        </a>
      </StatusBar.Button>
      <StatusBar.Button asChild>
        <a href='https://github.com/dxos/dxos' target='_blank' rel='noopener noreferrer'>
          <Icon icon='ph--github-logo--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>{t('github label')}</StatusBar.Text>
        </a>
      </StatusBar.Button>
      <VersionNumber />
    </Popover.Root>
  );
};

export const StatusBarPanel = () => {
  return (
    <>
      <StatusBarActions />
      <span role='separator' className='grow' />
      <Surface role='status' />
    </>
  );
};
