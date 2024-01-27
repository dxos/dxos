//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, type ForwardedRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import type { ThreadEntity } from '../types';

export type ThreadProps = ThreadEntity & ThemedClassName<ComponentPropsWithRef<'div'>>;

export const Thread = forwardRef(
  ({ onFocus, children, classNames, ...props }: ThreadProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div role='none' {...props} className={mx('grid grid-cols-[3rem_1fr]', classNames)} ref={ref}>
        {children}
      </div>
    );
  },
);
