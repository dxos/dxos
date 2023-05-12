//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { ThemeContext, useThemeContext, useTranslation } from '@dxos/aurora';
import { mx, osTx } from '@dxos/aurora-theme';
import { defaultDialogContent, defaultOverlay } from '@dxos/react-shell';

import { SpaceResolverContext } from './ResolverContext';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = () => {
  const themeContext = useThemeContext();
  const { space } = useContext(SpaceResolverContext);
  const { t } = useTranslation('composer');
  return (
    <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
      <div role='none' className={mx(defaultOverlay, 'static bs-full')}>
        <div role='none' className={mx(defaultDialogContent, 'p-2 bs-64 shadow-none bg-transparent')}>
          {!space ? (
            <ResolverTree />
          ) : (
            <h1 className='text-lg font-system-normal'>{t('resolver init document message')}</h1>
          )}
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
