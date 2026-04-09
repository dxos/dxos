//
// Copyright 2025 DXOS.org
//

// Presentational component showing the active space name.
// Extracted from the deck companion so it can be tested independently.

import React from 'react';

import { Tag } from '@dxos/react-ui';

export type ActiveSpacePanelProps = {
  spaceName?: string;
};

export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {
  return (
    <div className='flex flex-col gap-2 p-4'>
      <h3 className='text-sm font-medium'>Exemplar Panel</h3>
      <p className='text-sm text-description'>
        This is a workspace-wide deck companion. It is always available regardless of which object is focused.
      </p>
      {spaceName && (
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-description'>Active space:</span>
          <Tag palette='neutral'>{spaceName}</Tag>
        </div>
      )}
    </div>
  );
};
