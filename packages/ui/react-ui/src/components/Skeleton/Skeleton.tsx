//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SkeletonProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  variant?: 'default' | 'circle' | 'text';
};

/**
 * A skeleton loading component that displays a placeholder while content is loading.
 */
const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ classNames, variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return <div {...props} className={tx('skeleton.root', 'skeleton', { variant }, classNames)} ref={forwardedRef} />;
  },
);

export { Skeleton };

export type { SkeletonProps };
