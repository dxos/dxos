//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React from 'react';

import { composable, composableProps } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';

export type SeparatorOrientation = 'horizontal' | 'vertical';

export type SeparatorProps = {
  orientation?: SeparatorOrientation;
  /** A purely visual rule, hidden from assistive tech (e.g. between listbox options, which admit no separator role). */
  decorative?: boolean;
};

/** A 1px rule in the separator colour: horizontal across its track, or vertical and control-tall in a row. */
export const Separator = composable<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', decorative, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.separator() });
    return (
      <div
        {...rest}
        // `separator` is horizontal by default, so only the vertical case spells out its orientation.
        {...(decorative
          ? { 'role': 'none', 'aria-hidden': true }
          : { role: 'separator', ...(orientation === 'vertical' && { 'aria-orientation': 'vertical' as const }) })}
        data-scope='separator'
        data-part='root'
        data-orientation={orientation}
        className={className}
        ref={forwardedRef}
      />
    );
  },
);

Separator.displayName = 'Separator';
