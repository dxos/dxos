//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Clipboard, Container, ElevationProvider, Tooltip, useThemeContext } from '@dxos/react-ui';

export type StorybookDialogProps = PropsWithChildren & {
  inOverlayLayout?: boolean;
};

/**
 * @deprecated Create decorator.
 */
export const StorybookDialog = (props: StorybookDialogProps) => {
  const { inOverlayLayout = false } = props;
  const { tx } = useThemeContext();
  return (
    <Tooltip.Provider>
      <ElevationProvider elevation='dialog'>
        <Clipboard.Provider>
          <div
            role='group'
            className={tx('dialog.content', { inOverlayLayout }, 'w-[30rem]', inOverlayLayout ? 'm-4' : '')}
          >
            <Container.Column>{props.children}</Container.Column>
          </div>
        </Clipboard.Provider>
      </ElevationProvider>
    </Tooltip.Provider>
  );
};
