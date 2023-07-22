//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { ShellLayout, useClient } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { ResolverTree } from './ResolverTree';

export const ResolverDialog = () => {
  const { t } = useTranslation('composer');
  const client = useClient();
  const shell = useShell();

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE);
  };

  const handleCreateSpace = () => {
    void client.createSpace();
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
