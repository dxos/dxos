//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, memo } from 'react';

import { Button, Icon } from '@dxos/react-ui';

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
        classNames={['is-6 pli-0 dx-focus-ring-inset', hidden ? 'hidden' : !isBranch && 'invisible']}
        onClick={onToggle}
      >
        <Icon icon='ph--caret-right--bold' size={3} classNames={['transition duration-200', open && 'rotate-90']} />
      </Button>
    );
  }),
);
