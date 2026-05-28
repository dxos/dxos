//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithRef, type PropsWithChildren, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

export type IconBlockProps = ThemedClassName<
  ComponentPropsWithRef<'div'> &
    PropsWithChildren<{
      /** When true, pads child slots by 0.25rem (matches the geometry of an `IconButton iconOnly`). */
      padding?: boolean;
    }>
>;

/**
 * Static layout slot sized to `--dx-rail-item` (the same square that an `IconButton iconOnly`
 * occupies). Use whenever a decorative `<Icon>` needs to share a row, column, or grid track with
 * interactive `IconButton`s without drifting by a pixel.
 *
 * The `padding` flag mirrors the inset that `IconButton` applies, so a wrapped child element
 * (e.g., a drag handle, a menu trigger) lands in the same visible box as a bare icon would.
 */
export const IconBlock = forwardRef<HTMLDivElement, IconBlockProps>(
  ({ classNames, children, padding, ...props }, forwardedRef) => {
    return (
      <div
        {...props}
        className={mx(
          'grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center',
          padding && '[&>*]:p-1',
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

IconBlock.displayName = 'IconBlock';
