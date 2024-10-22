//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, memo, useMemo } from 'react';

import { Button, Icon } from '@dxos/react-ui';

export type TreeItemToggleProps = {
  open?: boolean;
  isBranch?: boolean;
  onToggle?: () => void;
};

export const TreeItemToggle = memo(
  forwardRef<HTMLButtonElement, TreeItemToggleProps>(({ open, isBranch, onToggle }, forwardedRef) => {
    const buttonClassNames = useMemo(() => ['!pli-1', !isBranch && 'invisible'], [isBranch]);
    const iconClassNames = useMemo(() => ['transition duration-200', open && 'rotate-90'], [open]);

    return (
      <Button
        ref={forwardedRef}
        data-testid='treeItem.toggle'
        variant='ghost'
        density='fine'
        classNames={buttonClassNames}
        onClick={onToggle}
      >
        <Icon icon='ph--caret-right--regular' size={3} classNames={iconClassNames} />
      </Button>
    );
  }),
);
