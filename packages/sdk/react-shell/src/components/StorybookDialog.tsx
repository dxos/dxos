//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { ElevationProvider, useThemeContext } from '@dxos/aurora';

import { ClipboardProvider } from './Clipboard';

export type StorybookDialogProps = PropsWithChildren & {
  inOverlayLayout?: boolean;
};

// TODO(burdon): Move out of components.
export const StorybookDialog = (props: StorybookDialogProps) => {
  const { inOverlayLayout = false } = props;
  const { tx } = useThemeContext();
  return (
    <ElevationProvider elevation='chrome'>
      <ClipboardProvider>
        <div
          role='group'
          className={tx('dialog.content', 'dialog', { inOverlayLayout }, 'p-1', inOverlayLayout ? 'm-4' : '')}
        >
          {props.children}
        </div>
      </ClipboardProvider>
    </ElevationProvider>
  );
};
