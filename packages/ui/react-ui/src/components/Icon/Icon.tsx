//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef, memo } from 'react';

import { type Size } from '@dxos/react-ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

const ICONS_URL = '/icons.svg';

export type IconProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.svg>> & { icon: string; size?: Size };

export const Icon = memo(
  forwardRef<SVGSVGElement, IconProps>(({ icon, classNames, size, ...props }, forwardedRef) => {
    const { tx, noCache } = useThemeContext();
    const url = noCache ? `${ICONS_URL}?nocache=${new Date().getMinutes()}` : ICONS_URL;
    return (
      <svg {...props} className={tx('icon.root', 'icon', { size }, classNames)} ref={forwardedRef}>
        <use href={`${url}#${icon}`} />
      </svg>
    );
  }),
);
