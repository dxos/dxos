//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

export type LinkVariant = 'accent' | 'neutral';

export type LinkProps = ThemedClassName<ComponentPropsWithRef<typeof ark.a>> & {
  /** `accent` colours the text (the default); `neutral` keeps the surrounding colour and underlines on hover. */
  variant?: LinkVariant;
};

/**
 * Inline text link, opening in a new tab unless `target` says otherwise. Ark has no link part, so it is a plain
 * `<a>` (or, with `asChild`, the child, e.g. a router link).
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ classNames, variant = 'accent', target = '_blank', rel = 'noreferrer', ...props }, forwardedRef) => (
    <ark.a
      {...props}
      target={target}
      rel={rel}
      data-scope='link'
      data-part='root'
      data-variant={variant}
      className={mx(recipes.link(), classNames)}
      ref={forwardedRef}
    />
  ),
);

Link.displayName = 'Next.Link';
