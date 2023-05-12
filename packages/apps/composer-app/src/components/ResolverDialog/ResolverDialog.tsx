//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useThemeContext, ThemeContext } from '@dxos/aurora';
import { mx, osTx } from '@dxos/aurora-theme';
import { defaultDialogContent, defaultOverlay } from '@dxos/react-shell';

import { ResolverProps } from './ResolverProps';
import { ResolverTree } from './ResolverTree';

export const ResolverDialog = (props: ResolverProps) => {
  const themeContext = useThemeContext();
  return (
    <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
      <div role='none' className={mx(defaultOverlay, 'static')}>
        <div role='none' className={mx(defaultDialogContent)}>
          <ResolverTree {...props} />
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
