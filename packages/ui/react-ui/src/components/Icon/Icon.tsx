//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type Size } from '@dxos/react-ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type IconProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.svg>> & { icon: string; size?: Size };

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ icon, classNames, size, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <svg {...props} className={tx('icon.root', 'icon', { size }, classNames)} ref={forwardedRef}>
      <use href={`/icons.svg#${icon}`} />
    </svg>
  );
});
