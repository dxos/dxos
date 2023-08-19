//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { ElevationProvider, useThemeContext } from '@dxos/aurora';

export type StorybookDialogProps = PropsWithChildren & {
  inOverlayLayout?: boolean;
};

export const StorybookDialog = (props: StorybookDialogProps) => {
  const { inOverlayLayout = false } = props;
  const { tx } = useThemeContext();
  return (
    <ElevationProvider elevation='chrome'>
      <div
        role='group'
        className={tx('dialog.content', 'dialog', { inOverlayLayout }, 'p-1', inOverlayLayout ? 'm-4' : '')}
      >
        {props.children}
      </div>
    </ElevationProvider>
  );
};
