//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks/useThemeContext.ts';
import { composable, composableProps } from '../../util/slots.ts';
import { IconBlockStyleProps } from './Icon.theme.ts';

type IconBlockProps = PropsWithChildren<IconBlockStyleProps>;

/**
 * Static layout slot sized to `--dx-rail-item` (the same square that an `IconButton iconOnly`
 * occupies). Use whenever a decorative `<Icon>` needs to share a row, column, or grid track with
 * interactive `IconButton`s without drifting by a pixel.
 *
 * Defaults `aria-hidden='true'` — the slot wraps decorative chrome by default. Pass
 * `aria-hidden={false}` when the slot's contents convey meaning that isn't already labelled
 * elsewhere in the row.
 */
const IconBlock = composable<HTMLDivElement, IconBlockProps>(
  ({ children, compact, square, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    return (
      // The default precedes the spread so a caller's `aria-hidden={false}` actually wins, as the
      // doc comment promises; after the spread it silently overrode every explicit value.
      <div aria-hidden='true' {...rest} className={tx('icon.block', { compact, square }, className)} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

IconBlock.displayName = 'IconBlock';

export { IconBlock as Root };
export type { IconBlockProps as RootProps };
