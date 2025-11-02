//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef, memo } from 'react';

import { type Size } from '@dxos/react-ui-types';

import { useIconHref, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type IconProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.svg>> & {
  icon: string;
  size?: Size;
};

export const Icon = memo(
  forwardRef<SVGSVGElement, IconProps>(({ icon, classNames, size = 4, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const href = useIconHref(icon);
    return (
      <svg {...props} className={tx('icon.root', 'icon', { size }, classNames)} ref={forwardedRef}>
        <use href={href} />
      </svg>
    );
  }),
);
