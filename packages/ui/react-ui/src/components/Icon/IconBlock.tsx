//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { composable, composableProps } from '../../util/index.ts';
import { IconBlockStyleProps } from './Icon.theme';

export type IconBlockProps = PropsWithChildren<IconBlockStyleProps>;

/**
 * Static layout slot sized to `--dx-rail-item` (the same square that an `IconButton iconOnly`
 * occupies). Use whenever a decorative `<Icon>` needs to share a row, column, or grid track with
 * interactive `IconButton`s without drifting by a pixel.
 *
 * Defaults `aria-hidden='true'` — the slot wraps decorative chrome by default. Pass
 * `aria-hidden={false}` when the slot's contents convey meaning that isn't already labelled
 * elsewhere in the row.
 */
export const IconBlock = composable<HTMLDivElement, IconBlockProps>(
  ({ children, compact, square, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    return (
      <div {...rest} aria-hidden='true' className={tx('icon.block', { compact, square }, className)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

IconBlock.displayName = 'IconBlock';
