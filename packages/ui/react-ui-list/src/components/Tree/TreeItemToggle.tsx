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
  hidden?: boolean;
};

export const TreeItemToggle = memo(
  forwardRef<HTMLButtonElement, TreeItemToggleProps>(({ open, isBranch, hidden, onToggle }, forwardedRef) => {
    return (
      <Button
        ref={forwardedRef}
        data-testid='treeItem.toggle'
        aria-expanded={open}
        variant='ghost'
        density='fine'
        classNames={mx('is-4 dx-focus-ring-inset pli-0', hidden ? 'hidden' : !isBranch && 'invisible')}
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
