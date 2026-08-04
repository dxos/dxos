//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useLandmarkMover } from '@dxos/react-ui';

import * as DeckRole from '../../types/DeckRole';

export const StatusBar = ({ showHints }: { showHints?: boolean }) => {
  const mover = useLandmarkMover(undefined, '3');
  return (
    <div
      role='contentinfo'
      className='fixed bottom-0 inset-x-0 h-(--dx-statusbar-size) border-y border-separator z-[2] flex text-description'
      {...mover}
    >
      {showHints && <Surface.Surface type={DeckRole.Hints} limit={1} />}
      <Surface.Surface type={DeckRole.StatusBar} limit={1} />
    </div>
  );
};

StatusBar.displayName = 'StatusBar';
