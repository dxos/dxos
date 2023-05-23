//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { Button, DensityProvider, useTranslation } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { SpaceResolverContext } from './ResolverContext';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = () => {
  const { space } = useContext(SpaceResolverContext);
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
    <DensityProvider density='fine'>
      <div role='none' className={osTx('dialog.overlay', 'dialog--resolver__overlay', {}, 'static bs-full')}>
        <div
          role='none'
          className={osTx('dialog.content', 'dialog--resolver__content', {}, 'p-2 bs-64 shadow-none bg-transparent')}
        >
          {!space ? (
            <ResolverTree />
          ) : (
            <h1 className='text-lg font-system-normal'>{t('resolver init document message')}</h1>
          )}
          <div role='group' className='flex is-full gap-2'>
            <Button classNames='grow' onClick={handleCreateSpace}>
              {t('create space label', { ns: 'appkit' })}
            </Button>
            <Button classNames='grow' onClick={handleJoinSpace}>
              {t('join space label', { ns: 'appkit' })}
            </Button>
          </div>
        </div>
      </div>
    </DensityProvider>
  );
};
