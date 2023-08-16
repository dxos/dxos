//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { ElevationProvider, useThemeContext } from '@dxos/aurora';

export type DialogProps = PropsWithChildren & {};

export const Dialog = (props: DialogProps) => {
  const { tx } = useThemeContext();
  return (
    <ElevationProvider elevation='chrome'>
      <div role='group' className={tx('dialog.content', 'dialog', { inOverlayLayout: false }, 'p-1')}>
        {props.children}
      </div>
    </ElevationProvider>
  );
};
