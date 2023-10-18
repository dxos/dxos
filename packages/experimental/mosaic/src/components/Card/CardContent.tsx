//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Icon } from './util';
import { ScrollContainer } from '../ScrollContainer';

// TODO(burdon): Vertical scroll.

export type CardContentSlots = {
  root?: {
    className?: string;
  };
  body?: {
    className?: string;
  };
};

export type CardContentProps = {
  slots?: CardContentSlots;
  gutter?: boolean;
  icon?: ReactNode;
  scrollbar?: boolean;
  children?: ReactNode;
};

export const CardContent = ({ slots = {}, gutter, icon, scrollbar, children }: CardContentProps) => {
  return (
    <div className={mx('flex pl-2', slots.root?.className)}>
      {(gutter || icon) && <Icon>{icon}</Icon>}
      {(scrollbar && (
        <div className={mx('flex w-full overflow-hidden')}>
          <ScrollContainer vertical>
            <div className={mx('flex w-full py-2 px-2', slots.body?.className)}>{children}</div>
          </ScrollContainer>
        </div>
      )) || <div className={mx('flex w-full py-2 px-2', slots?.body?.className)}>{children}</div>}
    </div>
  );
};
