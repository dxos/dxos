//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks/useThemeContext.ts';

type SkeletonProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  variant?: 'default' | 'circle' | 'text';
};

/**
 * A skeleton loading component that displays a placeholder while content is loading.
 */
const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ classNames, variant = 'default', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return <div {...props} className={tx('skeleton.root', { variant }, classNames)} ref={forwardedRef} />;
  },
);

export { Skeleton as Root };

export type { SkeletonProps as RootProps };

export * from './Skeleton.theme.ts';
