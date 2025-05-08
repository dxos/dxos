//
// Copyright 2023 DXOS.org
//
import {
  Separator as SeparatorPrimitive,
  type SeparatorProps as SeparatorPrimitiveProps,
} from '@radix-ui/react-separator';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SeparatorProps = ThemedClassName<SeparatorPrimitiveProps>;

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ classNames, orientation = 'horizontal', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SeparatorPrimitive
        orientation={orientation}
        {...props}
        className={tx('separator.root', 'separator', { orientation }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export type { SeparatorProps };

export { Separator };
