//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type TypographyProps = {};

/**
 * Text whose first line is centred in a block, so it lines up with a Block or control beside it however many lines
 * it wraps to. Renders a `<p>`; `asChild` puts the metrics on a heading or other text element instead.
 */
export const Typography = slottable<HTMLParagraphElement, TypographyProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.typography() });
    return (
      <ark.p
        asChild={asChild}
        {...rest}
        data-scope='typography'
        data-part='root'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.p>
    );
  },
);

Typography.displayName = 'Next.Typography';
