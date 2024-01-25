//
// Copyright 2024 DXOS.org
//

import { TextB } from '@phosphor-icons/react';
import React from 'react';

import { Button, DensityProvider } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type ToolbarProps = {
  // TODO(burdon): Event?
  onAction?: (action: string) => void;
};

// TODO(burdon): Actions
//  - Bold/italic
//  - Lists
//  - Table
//  - Comment
//  - Link (page/web)
//  - Image
//  - Code

export const Toolbar = ({ onAction }: ToolbarProps) => {
  return (
    <DensityProvider density='fine'>
      <div role='toolbar'>
        <Button variant='ghost' classNames='p-0' onClick={() => onAction?.('bold')}>
          <TextB className={getSize(5)} />
        </Button>
      </div>
    </DensityProvider>
  );
};
