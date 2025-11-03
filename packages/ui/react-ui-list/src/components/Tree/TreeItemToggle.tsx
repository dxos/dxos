//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, memo } from 'react';

import { IconButton, type IconButtonProps } from '@dxos/react-ui';

export type TreeItemToggleProps = Omit<IconButtonProps, 'icon' | 'size' | 'label'> & {
  open?: boolean;
  isBranch?: boolean;
  hidden?: boolean;
};

export const TreeItemToggle = memo(
  forwardRef<HTMLButtonElement, TreeItemToggleProps>(
    ({ open, isBranch, hidden, classNames, ...props }, forwardedRef) => (
      <IconButton
        ref={forwardedRef}
        data-testid='treeItem.toggle'
        aria-expanded={open}
        variant='ghost'
        density='fine'
        classNames={[
          'bs-full is-6 pli-0',
          '[&_svg]:transition-[transform] [&_svg]:duration-200',
          open && '[&_svg]:rotate-90',
          hidden ? 'hidden' : !isBranch && 'invisible',
          classNames,
        ]}
        size={3}
        icon='ph--caret-right--bold'
        iconOnly
        noTooltip
        label={open ? 'Click to close' : 'Click to open'}
        tabIndex={-1}
        {...props}
      />
    ),
  ),
);
