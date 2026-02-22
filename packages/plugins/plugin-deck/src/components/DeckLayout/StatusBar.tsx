//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useLandmarkMover } from '@dxos/react-ui';

export const StatusBar = ({ showHints }: { showHints?: boolean }) => {
  const mover = useLandmarkMover(undefined, '3');
  return (
    <div
      role='contentinfo'
      className='fixed bottom-0 inset-x-0 block-[--statusbar-size] border-y border-separator z-[2] flex text-description'
      {...mover}
    >
      {showHints && <Surface.Surface role='hints' limit={1} />}
      <Surface.Surface role='status-bar' limit={1} />
    </div>
  );
};
