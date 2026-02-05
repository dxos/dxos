//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/react';
import { useLandmarkMover } from '@dxos/react-ui';

export const StatusBar = ({ showHints }: { showHints?: boolean }) => {
  const mover = useLandmarkMover(undefined, '3');
  return (
    <div
      role='contentinfo'
      className='fixed block-end-0 inset-inline-0 bs-[--statusbar-size] border-bs border-separator z-[2] flex text-description'
      {...mover}
    >
      {showHints && <Surface role='hints' limit={1} />}
      <Surface role='status-bar' limit={1} />
    </div>
  );
};
