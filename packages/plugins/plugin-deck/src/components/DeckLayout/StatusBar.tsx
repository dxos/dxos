//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { mainPadding, mx } from '@dxos/react-ui-theme';

import { useMainSize } from '../../hooks';

export const StatusBar = () => {
  const sizeAttrs = useMainSize();
  return (
    <div role='none' {...sizeAttrs} className={mx('fixed block-end-0 inset-inline-0 z-[2]', mainPadding)}>
      <Surface role='status-bar' limit={1} />
    </div>
  );
};
