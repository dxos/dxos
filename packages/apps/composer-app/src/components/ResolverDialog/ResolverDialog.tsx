//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { Button, DensityProvider, ThemeContext, useThemeContext, useTranslation } from '@dxos/aurora';
import { mx, osTx } from '@dxos/aurora-theme';
import { ShellLayout } from '@dxos/client';
import { defaultDialogContent, defaultOverlay, useShell } from '@dxos/react-shell';

import { SpaceResolverContext } from './ResolverContext';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = () => {
  const themeContext = useThemeContext();
  const { space } = useContext(SpaceResolverContext);
  const { t } = useTranslation('composer');
  const shell = useShell();
  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE);
  };
  return (
    <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
      <DensityProvider density='fine'>
        <div role='none' className={mx(defaultOverlay, 'static bs-full')}>
          <div role='none' className={mx(defaultDialogContent, 'p-2 bs-64 shadow-none bg-transparent')}>
            {!space ? (
              <ResolverTree />
            ) : (
              <h1 className='text-lg font-system-normal'>{t('resolver init document message')}</h1>
            )}
            <Button className='is-full' onClick={handleJoinSpace}>
              {t('join space label', { ns: 'appkit' })}
            </Button>
          </div>
        </div>
      </DensityProvider>
    </ThemeContext.Provider>
  );
};
