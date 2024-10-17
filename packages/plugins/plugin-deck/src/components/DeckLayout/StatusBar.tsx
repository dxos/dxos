//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { mainPadding, mx } from '@dxos/react-ui-theme';

import { useMainSize } from '../../hooks';

export const StatusBar = ({ showHints }: { showHints?: boolean }) => {
  const sizeAttrs = useMainSize();
  return (
    <div
      role='none'
      {...sizeAttrs}
      className={mx(
        'fixed flex justify-between block-end-0 inset-inline-0 items-center border-bs border-separator z-[2]',
        mainPadding,
      )}
    >
      <div role='none'>{showHints && <Surface role='hints' limit={1} />}</div>
      <Surface role='status-bar' limit={1} />
    </div>
  );
};
