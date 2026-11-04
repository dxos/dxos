//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type HTMLAttributes, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

type BadgeCorner = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

type BadgeRootProps = ThemedClassName<HTMLAttributes<HTMLSpanElement>>;

/** Sizes to its child (an Avatar or an Icon) and anchors a `Mark` to one of its corners. */
const BadgeRoot = forwardRef<HTMLSpanElement, BadgeRootProps>(({ classNames, ...props }, forwardedRef) => (
  <span {...props} data-scope='badge' data-part='root' className={mx(recipes.badge(), classNames)} ref={forwardedRef} />
));

BadgeRoot.displayName = 'Badge.Root';

type BadgeMarkProps = ThemedClassName<HTMLAttributes<HTMLSpanElement>> & {
  corner?: BadgeCorner;
};

/**
 * A small glyph (an Avatar with `fill`, or an Icon) half the root's size over one of its corners, ringed in the surface
 * colour so it reads as cut out of what it overlaps.
 */
const BadgeMark = forwardRef<HTMLSpanElement, BadgeMarkProps>(
  ({ classNames, corner = 'bottom-end', ...props }, forwardedRef) => (
    <span
      {...props}
      data-scope='badge'
      data-part='mark'
      data-corner={corner}
      className={mx(recipes.badgeMark(), classNames)}
      ref={forwardedRef}
    />
  ),
);

BadgeMark.displayName = 'Badge.Mark';

export { BadgeMark as Mark, BadgeRoot as Root };
export type { BadgeCorner as Corner, BadgeMarkProps as MarkProps, BadgeRootProps as RootProps };
