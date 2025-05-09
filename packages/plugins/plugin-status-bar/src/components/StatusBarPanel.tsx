//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';

import { StatusBar } from './StatusBar';
import { VersionNumber } from './VersionNumber';
import { STATUS_BAR_PLUGIN } from '../meta';

export const StatusBarActions = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <EnvironmentLabel />
      <VersionNumber />
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

const ENV_LABELS: Record<string, string> = {
  'edge-dev': 'D',
  'edge-main': 'M',
  'edge-labs': 'L',
  'edge-production': 'P',
};

const EnvironmentLabel = () => {
  const config = useConfig();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  if (!edgeUrl) {
    return null;
  }
  const edgeEnv = ENV_LABELS[new URL(edgeUrl).host.split('.')[0]];
  if (!edgeEnv) {
    return null;
  }

  return (
    <StatusBar.Item>
      <StatusBar.Text classNames='text-xs text-subdued border rounded-full px-1'>{edgeEnv}</StatusBar.Text>
    </StatusBar.Item>
  );
};
