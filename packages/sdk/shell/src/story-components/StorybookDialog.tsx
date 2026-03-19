//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Clipboard, Column, ElevationProvider, Tooltip, useThemeContext } from '@dxos/react-ui';

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
            <Column.Root>{props.children}</Column.Root>
          </div>
        </Clipboard.Provider>
      </ElevationProvider>
    </Tooltip.Provider>
  );
};
