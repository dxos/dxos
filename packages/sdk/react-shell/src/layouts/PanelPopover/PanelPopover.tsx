//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps } from 'react';

import { mx } from '@dxos/aurora';
import { Popover } from '@dxos/react-appkit';

import { defaultSurface, defaultArrow } from '../../styles';

/**
 * This component essentially sets default styles for popovers which have panels as their content
 * @param slots
 * @param children
 * @param popoverProps
 * @constructor
 */
export const PanelPopover = ({ slots, children, ...popoverProps }: ComponentProps<typeof Popover>) => {
  return (
    <Popover
      slots={{
        arrow: { ...slots?.arrow, className: mx(defaultArrow, slots?.arrow?.className) },
        content: {
          collisionPadding: 8,
          sideOffset: 4,
          ...slots?.content,
          className: mx(defaultSurface, slots?.content?.className)
        },
        trigger: {
          ...slots?.trigger,
          className: mx('', slots?.trigger?.className)
        },
        ...slots
      }}
      {...popoverProps}
    >
      {children}
    </Popover>
  );
};
