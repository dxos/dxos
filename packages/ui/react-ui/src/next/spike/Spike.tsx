//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties, type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { createContext, useComposedRefs } from '@dxos/react-hooks';

import { ScrollAreaThumbs } from '../../components/ScrollArea/ScrollAreaThumbs.tsx';
import { scrollbar } from '../../components/ScrollArea/scrollbar.ts';
import { composableProps, slottable } from '../../util/index.ts';
import { type Size } from '../sizes.ts';
import { styles } from './styles.ts';

export type Gutter = 'rail' | 'inset' | 'sm' | 'md' | 'lg' | 'none' | 'inherit';

export const SpikeStyles = () => <style>{styles}</style>;

//
// ScrollArea
//

type ScrollAreaContextValue = {
  native: boolean;
  setViewport: (viewport: HTMLElement | null) => void;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextValue>('Spike.ScrollArea');

type ScrollAreaRootProps = { native?: boolean; size?: Size };

/** Non-scrolling frame: hosts the overlay thumbs and is the query container for its content. */
const ScrollAreaRoot = slottable<HTMLDivElement, ScrollAreaRootProps>(
  ({ children, native = false, size, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const { className, ...rest } = composableProps(props);
    return (
      <ScrollAreaProvider native={native} setViewport={setViewport}>
        <div
          {...rest}
          data-size={size}
          className={['nx-scroll-root group/scroll-v', className].join(' ')}
          ref={forwardedRef}
        >
          {children}
          {!native && viewport && (
            <ScrollAreaThumbs viewport={viewport} orientation='vertical' density={scrollbar.lg} autoHide={false} />
          )}
        </div>
      </ScrollAreaProvider>
    );
  },
);

/** The scrolling element; under `asChild` it is the child (e.g. a Container) itself. */
const ScrollAreaViewport = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { native, setViewport } = useScrollAreaContext('Spike.ScrollArea.Viewport');
  const ref = useComposedRefs(forwardedRef, setViewport);
  const { className, style, ...rest } = composableProps(props);
  return (
    <ark.div
      asChild={asChild}
      {...rest}
      data-native={native ? '' : undefined}
      style={{ '--scroll-width': `${scrollbar.lg.size}px`, ...style } as CSSProperties}
      className={['nx-scroll-viewport', className].join(' ')}
      ref={ref}
    >
      {children}
    </ark.div>
  );
});

export const ScrollArea = { Root: ScrollAreaRoot, Viewport: ScrollAreaViewport };

//
// Container
//

export type ContainerProps = {
  size?: Size;
  gutter?: Gutter;
  /** Inner template for the content track; interior line names only (e.g. `auto [field] minmax(0,1fr)`), since edge names would collide with `content-start`/`content-end`. */
  columns?: string;
  /** `stack` places each child across the content track; `row` flows children through its inner tracks. */
  layout?: 'stack' | 'row';
  /** Placement of the container itself within a parent Container. */
  place?: 'content' | 'full';
};

export const Container = slottable<HTMLDivElement, ContainerProps>(
  ({ children, asChild, size, gutter = 'inherit', columns, layout = 'stack', place, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs(forwardedRef, localRef);
    const { className, style, ...rest } = composableProps(props);

    // Subgrid only reaches the parent's tracks from a direct child.
    useEffect(() => {
      const parent = localRef.current?.parentElement;
      if (gutter === 'inherit' && parent && !parent.matches('.nx-grid, .nx-scroll-root')) {
        log.warn('inheriting Container is not a direct child of a Container', { parent: parent.className });
      }
    }, [gutter]);

    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-size={size}
        data-gutter={gutter}
        data-layout={layout}
        data-place={place}
        data-columns={columns ? '' : undefined}
        style={{ ...(columns ? { '--columns': columns } : {}), ...style } as CSSProperties}
        className={['nx-grid', className].join(' ')}
        ref={ref}
      >
        {children}
      </ark.div>
    );
  },
);

//
// Leaf parts
//

export const Block = ({ children, rail, ...props }: PropsWithChildren<{ rail?: 'start' | 'end' }>) => (
  <div {...props} data-rail={rail} className='nx-block'>
    {children}
  </div>
);
