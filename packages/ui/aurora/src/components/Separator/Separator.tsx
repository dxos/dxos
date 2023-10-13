//
// Copyright 2023 DXOS.org
//
import {
  Separator as SeparatorPrimitive,
  type SeparatorProps as SeparatorPrimitiveProps,
} from '@radix-ui/react-separator';
import React from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SeparatorProps = ThemedClassName<SeparatorPrimitiveProps>;

const Separator = ({ classNames, orientation = 'horizontal', ...props }: SeparatorProps) => {
  const { tx } = useThemeContext();
  return (
    <SeparatorPrimitive
      orientation={orientation}
      {...props}
      className={tx('separator.root', 'separator', { orientation }, classNames)}
    />
  );
};

export type { SeparatorProps };

export { Separator };
