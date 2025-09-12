//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Json } from '@dxos/react-ui-syntax-highlighter';

import { ToggleContainer } from '../../ToggleContainer';
import { type XmlComponentProps } from '../extensions';

export type FallbackProps = XmlComponentProps<any>;

export const Fallback = ({ tag, ...props }: FallbackProps) => {
  return (
    <ToggleContainer.Root classNames='rounded-sm'>
      <ToggleContainer.Header classNames='bg-groupSurface' title={tag} />
      <ToggleContainer.Content classNames='bg-modalSurface'>
        {/* TODO(burdon): Can we avoid the ! */}
        <Json classNames='!p-2 text-sm' data={props} />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};
