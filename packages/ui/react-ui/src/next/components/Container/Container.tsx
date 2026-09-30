//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties, useEffect, useRef } from 'react';

import { log } from '@dxos/log';
import { useComposedRefs } from '@dxos/react-hooks';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

export type Level = 'sunken' | 'chrome' | 'base' | 'raised' | 'overlay' | 'popup' | '+1';

/** Custom properties, which React's `CSSProperties` does not declare. */
export type CSSVariables = Record<`--${string}`, string>;

export type Gutter = 'rail' | 'inset' | 'sm' | 'md' | 'lg' | 'none' | 'inherit';

/** Space between the container's rows; the current `ColumnGap` steps (0.25, 0.5, 0.75rem). */
export type ContainerGap = 'none' | 'sm' | 'md' | 'lg';

//
// Container
//

export type ContainerProps = {
  size?: Size;
  /** `inherit` makes the container a subgrid of its parent's tracks; any other value starts a fresh template. */
  gutter?: Gutter;
  /** Inner template for the content track; interior line names only, since edge names collide with `content-*`. */
  columns?: string;
  /** `stack` places each child across the content track; `row` flows children through its inner tracks. */
  layout?: 'stack' | 'row';
  /** Placement of the container itself within a parent Container. */
  place?: 'content' | 'full';
  /** A rung of ui-theme's surface ladder, or `+1` for one rung above the enclosing level. */
  level?: Level;
  /** Row gap only: columns are shared through subgrid, so a column gap would shift the parent's tracks. */
  gap?: ContainerGap;
};

/** Grid part (decision 5): every prop is a `data-*` attribute resolved by `theme/container.css`. */
export const Container = slottable<HTMLDivElement, ContainerProps>(
  (
    { children, asChild, size, gutter = 'inherit', columns, layout = 'stack', place, level, gap, ...props },
    forwardedRef,
  ) => {
    const localRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs(forwardedRef, localRef);
    const { className, style, ...rest } = composableProps(props, { classNames: recipes.container() });

    // Subgrid only reaches the parent's tracks from a direct child.
    useEffect(() => {
      if (process.env.NODE_ENV === 'production' || gutter !== 'inherit') {
        return;
      }
      const parent = localRef.current?.parentElement;
      if (parent && !parent.matches('.nx-grid, .nx-scroll-root')) {
        log.warn('inheriting Container is not a direct child of a Container', { parent: parent.className });
      }
    }, [gutter]);

    const columnsStyle: CSSProperties & CSSVariables = columns ? { '--nx-columns': columns } : {};
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='container'
        data-part='root'
        data-size={size}
        data-gutter={gutter}
        data-layout={layout}
        data-place={place}
        data-surface={level}
        data-gap={gap}
        data-columns={columns ? '' : undefined}
        style={{ ...columnsStyle, ...style }}
        className={className}
        ref={ref}
      >
        {children}
      </ark.div>
    );
  },
);

Container.displayName = 'Next.Container';
