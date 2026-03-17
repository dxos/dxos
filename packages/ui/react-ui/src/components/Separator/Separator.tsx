//
// Copyright 2023 DXOS.org
//
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SeparatorProps = ThemedClassName<SeparatorPrimitive.SeparatorProps> & { subdued?: boolean };

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ classNames, orientation = 'horizontal', subdued, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SeparatorPrimitive.Root
        {...props}
        orientation={orientation}
        className={tx('separator.root', { orientation, subdued }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export type { SeparatorProps };

export { Separator };
