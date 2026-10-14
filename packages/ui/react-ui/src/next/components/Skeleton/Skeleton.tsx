//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

export type SkeletonVariant = 'default' | 'circle' | 'text';

export type SkeletonProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'children'>> & {
  /** `default` is a block-tall bar, `text` a line of text, `circle` a block-sized disc (an avatar). */
  variant?: SkeletonVariant;
};

/** A pulsing placeholder in the shape of the content it stands in for; hidden from assistive tech. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ classNames, variant = 'default', ...props }, forwardedRef) => (
    <div
      aria-hidden
      {...props}
      data-scope='skeleton'
      data-part='root'
      data-variant={variant}
      className={mx(recipes.skeleton(), classNames)}
      ref={forwardedRef}
    />
  ),
);

Skeleton.displayName = 'Skeleton';
