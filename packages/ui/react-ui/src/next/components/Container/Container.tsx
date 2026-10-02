//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties, type PropsWithChildren, createContext, useContext, useEffect, useRef } from 'react';

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

/** Tracks a child spans in its parent Container: a count, or `full` for every track of the content area. */
export type Span = number | 'full';

/**
 * The attributes that place an element across `span` tracks of its parent Container; the count travels as a custom
 * property because CSS cannot yet read a numeric attribute in every engine.
 */
export const spanAttributes = (span: Span | undefined) => {
  const style: CSSProperties & CSSVariables = typeof span === 'number' ? { '--nx-span': String(span) } : {};
  return { 'data-span': span === undefined ? undefined : String(span), style };
};

//
// Default gutter
//

/**
 * The gutter a Container takes when it names none. `Panel.Body` provides its panel's (`sm` by default), and every grid
 * part clears it for its subtree, so only the first Container under a Body becomes a template root on it and nested
 * Containers stay subgrids.
 */
const DefaultGutterContext = createContext<Gutter | undefined>(undefined);

/** The gutter an unnamed Container here would take, or `undefined` where it would inherit. */
export const useDefaultGutter = () => useContext(DefaultGutterContext);

/** True under a Container, whose content and gutter lines a subgrid (`gutter='inherit'`) can join. */
const InGridContext = createContext(false);

/** Whether this subtree sits inside a Container, so a nested scroll viewport can inherit its gutters. */
export const useInGrid = () => useContext(InGridContext);

/** Provides the gutter an unnamed Container under it takes (`undefined` restores `inherit`). */
export const DefaultGutterProvider = ({ gutter, children }: PropsWithChildren<{ gutter: Gutter | undefined }>) => (
  <DefaultGutterContext.Provider value={gutter}>{children}</DefaultGutterContext.Provider>
);

//
// Container
//

export type ContainerProps = {
  size?: Size;
  /**
   * `inherit` makes the container a subgrid of its parent's tracks; any other value starts a fresh template. Unset, it
   * is the enclosing `Panel.Body`'s gutter for the first Container under the Body, and `inherit` everywhere else.
   */
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
  /**
   * Block alignment of a `row`'s cells: `center` (default) centres controls in a one-block row; `start` tops cells of
   * differing heights (e.g. two forms side by side), which centring would offset against the tallest; `stretch` makes
   * every cell of a row as tall as its tallest (a grid of cards).
   */
  align?: 'center' | 'start' | 'stretch';
  /** Tracks the container spans in a parent Container (e.g. a cell across two columns of a `row`). */
  span?: Span;
  /** `document` caps a template root at the reading width and centres it (the current `dx-document`). */
  width?: 'document';
  /** Pads the block axis by the gutter too, so content scrolled in a template root starts and ends a gutter inside. */
  padBlock?: boolean;
};

/**
 * The attributes that make any element a Container (`.nx-grid` plus its `data-*` and `--nx-columns`), for a part that
 * must keep its own element and scope (a listbox row is Ark's item) rather than render a Container under `asChild`,
 * where the Container's `data-scope`/`data-part` would win (finding 10).
 */
export const containerAttributes = ({
  size,
  gutter = 'inherit',
  columns,
  layout = 'stack',
  place,
  level,
  gap,
  align,
  span,
  width,
  padBlock,
}: ContainerProps) => {
  const { style: spanStyle, ...spanAttrs } = spanAttributes(span);
  const style: CSSProperties & CSSVariables = columns ? { ...spanStyle, '--nx-columns': columns } : spanStyle;
  return {
    ...spanAttrs,
    'data-size': size,
    'data-gutter': gutter,
    'data-layout': layout,
    'data-place': place,
    'data-surface': level,
    'data-gap': gap,
    'data-align': align === 'center' ? undefined : align,
    'data-width': width,
    'data-pad-block': padBlock ? '' : undefined,
    'data-columns': columns ? '' : undefined,
    style,
  };
};

/** Grid part (decision 5): every prop is a `data-*` attribute resolved by `theme/container.css`. */
export const Container = slottable<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      asChild,
      size,
      gutter: gutterProp,
      columns,
      layout = 'stack',
      place,
      level,
      gap,
      align,
      span,
      width,
      padBlock,
      ...props
    },
    forwardedRef,
  ) => {
    const defaultGutter = useDefaultGutter();
    const gutter = gutterProp ?? defaultGutter ?? 'inherit';
    const localRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs(forwardedRef, localRef);
    const { className, style, ...rest } = composableProps(props, { classNames: recipes.container() });

    // Subgrid only reaches the parent's tracks from a direct child; own `columns` start a fresh template, so any parent will do.
    useEffect(() => {
      if (process.env.NODE_ENV === 'production' || gutter !== 'inherit' || columns) {
        return;
      }
      const parent = localRef.current?.parentElement;
      if (parent && !parent.matches('.nx-grid, .nx-scroll-root')) {
        log.warn('inheriting Container is not a direct child of a Container', { parent: parent.className });
      }
    }, [gutter, columns]);

    const { style: columnsStyle, ...attributes } = containerAttributes({
      size,
      gutter,
      columns,
      layout,
      place,
      level,
      gap,
      align,
      span,
      width,
      padBlock,
    });
    return (
      <DefaultGutterProvider gutter={undefined}>
        <InGridContext.Provider value>
          <ark.div
            asChild={asChild}
            {...rest}
            data-scope='container'
            data-part='root'
            {...attributes}
            style={{ ...columnsStyle, ...style }}
            className={className}
            ref={ref}
          >
            {children}
          </ark.div>
        </InGridContext.Provider>
      </DefaultGutterProvider>
    );
  },
);

Container.displayName = 'Next.Container';
