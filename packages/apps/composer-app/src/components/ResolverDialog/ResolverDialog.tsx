//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { ThemeContext, useThemeContext } from '@dxos/aurora';
import { mx, osTx } from '@dxos/aurora-theme';
import { defaultDialogContent, defaultOverlay } from '@dxos/react-shell';

import { SpaceResolverContext } from './ResolverContext';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = () => {
  const themeContext = useThemeContext();
  const { space } = useContext(SpaceResolverContext);
  return (
    <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
      <div role='none' className={mx(defaultOverlay, 'static')}>
        <div role='none' className={mx(defaultDialogContent)}>
          {!space ? <ResolverTree /> : <p>Setting up document, one sec…</p>}
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
