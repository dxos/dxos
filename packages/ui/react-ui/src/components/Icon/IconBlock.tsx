//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithRef, type PropsWithChildren, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { IconBlockStyleProps } from './Icon.theme';

export type IconBlockProps = ThemedClassName<ComponentPropsWithRef<'div'> & PropsWithChildren<IconBlockStyleProps>>;

/**
 * Static layout slot sized to `--dx-rail-item` (the same square that an `IconButton iconOnly`
 * occupies). Use whenever a decorative `<Icon>` needs to share a row, column, or grid track with
 * interactive `IconButton`s without drifting by a pixel.
 *
 * Defaults `aria-hidden='true'` — the slot wraps decorative chrome by default. Pass
 * `aria-hidden={false}` when the slot's contents convey meaning that isn't already labelled
 * elsewhere in the row.
 */
export const IconBlock = forwardRef<HTMLDivElement, IconBlockProps>(
  ({ classNames, children, compact, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div aria-hidden='true' {...props} className={tx('icon.block', { compact }, classNames)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

IconBlock.displayName = 'IconBlock';
