//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Icon, Toolbar as NaturalToolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Generalize.
export type Action =
  | { type: 'center' }
  | {
      type: 'create';
    }
  | {
      type: 'delete';
      ids: string[];
    };

export type ToolbarProps = ThemedClassName<{
  onAction?: (action: Action) => void;
}>;

export const Toolbar = ({ classNames, onAction }: ToolbarProps) => {
  return (
    <NaturalToolbar.Root classNames={mx('p-1', classNames)}>
      <NaturalToolbar.Button onClick={() => onAction?.({ type: 'create' })} title='Create objects.'>
        <Icon icon='ph--target--regular' />
        <Icon icon='ph--plus--regular' />
      </NaturalToolbar.Button>
    </NaturalToolbar.Root>
  );
};
