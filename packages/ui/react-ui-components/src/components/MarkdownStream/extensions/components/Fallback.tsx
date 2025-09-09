//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Json } from '@dxos/react-ui-syntax-highlighter';

import { ToggleContainer } from '../../../ToggleContainer';

export type FallbackProps = { tagName?: string; props?: any };

export const Fallback = ({ tagName, ...props }: FallbackProps) => {
  return (
    <ToggleContainer.Root>
      <ToggleContainer.Header title={tagName} />
      <ToggleContainer.Content>
        <Json classNames='text-sm' data={props} />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};
