//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { Button, useTranslation } from '@dxos/aurora';
import { ShellLayout } from '@dxos/react-client';
import { Plugin } from '@dxos/react-surface';

import { GITHUB_PLUGIN } from '../../props';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = ({ clientPlugin }: { clientPlugin?: Plugin<ClientPluginProvides> }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);

  const handleJoinSpace = () => {
    void clientPlugin?.provides.setLayout(ShellLayout.JOIN_SPACE);
  };

  const handleCreateSpace = () => {
    void clientPlugin?.provides.client.createSpace();
  };

  return (
    <>
      <ResolverTree />
      <div role='group' className='shrink-0 flex is-full gap-2'>
        <Button classNames='grow' onClick={handleCreateSpace}>
          {t('create space label', { ns: 'appkit' })}
        </Button>
        <Button classNames='grow' onClick={handleJoinSpace}>
          {t('join space label', { ns: 'appkit' })}
        </Button>
      </div>
    </>
  );
};
