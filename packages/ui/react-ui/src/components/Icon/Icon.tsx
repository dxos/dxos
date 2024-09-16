//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type IconProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.svg>> & { icon: string };

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ icon, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <svg {...props} className={tx('icon.root', 'icon', {}, classNames)} ref={forwardedRef}>
      <use href={`/icons.svg#${icon}`} />
    </svg>
  );
});
