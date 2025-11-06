//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { useConfig } from '@dxos/react-client';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '../meta';

import { StatusBar } from './StatusBar';
import { VersionNumber } from './VersionNumber';

export const StatusBarActions = () => {
  const { t } = useTranslation(meta.id);
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
  'edge-dev': 'Dev',
  'edge-main': 'Main',
  'edge-labs': 'Labs',
  'edge-production': 'Production',
};

const EnvironmentLabel = () => {
  const config = useConfig();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  if (!edgeUrl) {
    return null;
  }
  const part = new URL(edgeUrl).host.split('.')[0];
  const edgeEnv = ENV_LABELS[part];
  if (!edgeEnv) {
    return null;
  }

  return (
    <StatusBar.Item>
      <StatusBar.Text classNames='text-xs text-subdued border border-separator rounded-full px-1'>
        <span title={edgeEnv}>{edgeEnv[0]}</span>
      </StatusBar.Text>
    </StatusBar.Item>
  );
};
