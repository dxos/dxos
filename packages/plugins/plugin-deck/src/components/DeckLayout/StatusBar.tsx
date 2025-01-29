//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { mainPadding, mainPaddingTransitions, mx } from '@dxos/react-ui-theme';

import { useMainSize } from '../../hooks';

export const StatusBar = ({ showHints }: { showHints?: boolean }) => {
  const sizeAttrs = useMainSize();
  return (
    <div
      role='contentinfo'
      {...sizeAttrs}
      className={mx(
        'fixed block-end-0 inset-inline-0 flex justify-between items-center border-bs border-separator z-[2] pbe-[env(safe-area-inset-bottom)]',
        mainPadding,
        mainPaddingTransitions,
      )}
    >
      <div role='none'>{showHints && <Surface role='hints' limit={1} />}</div>
      <Surface role='status-bar' limit={1} />
    </div>
  );
};
