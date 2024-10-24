//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, memo } from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type TreeItemToggleProps = {
  open?: boolean;
  isBranch?: boolean;
  onToggle?: () => void;
};

export const TreeItemToggle = memo(
  forwardRef<HTMLButtonElement, TreeItemToggleProps>(({ open, isBranch, onToggle }, forwardedRef) => {
    return (
      <Button
        ref={forwardedRef}
        data-testid='treeItem.toggle'
        variant='ghost'
        density='fine'
        classNames={mx('!pli-1', !isBranch && 'invisible')}
        onClick={onToggle}
      >
        <Icon
          icon='ph--caret-right--regular'
          size={3}
          classNames={mx('transition duration-200', open && 'rotate-90')}
        />
      </Button>
    );
  }),
);
