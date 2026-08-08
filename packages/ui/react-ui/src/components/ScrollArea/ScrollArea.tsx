//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { CSSProperties, useMemo, useState } from 'react';

import { type AllowedAxis, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';
import { ScrollAreaThumbs } from './ScrollAreaThumbs';
import { scrollbar, type ScrollbarDensity } from './scrollbar';

//
// Context
//

const SCROLLAREA_NAME = 'ScrollArea';

type ScrollAreaOptions = {
  /** Orientation of scrollbars. */
  orientation: AllowedAxis;
  /** Hide scrollbars when not scrolling. */
  autoHide: boolean;
  /** Show scrollbars. */
  scrollbars?: boolean;
  /** Apply padding to opposite side of scrollbar. */
  centered?: boolean;
  /** Apply padding. */
  padding: boolean;
  /** Use thin scrollbars. */
  thin: boolean;
  /** Enable snap scrolling. */
  snap: boolean;
  /** Paint the thumb over the content instead of reserving layout space for a native scrollbar. */
  overlay: boolean;
};

type ScrollAreaContextType = ScrollAreaOptions & {
  density: ScrollbarDensity;
  setViewport: (viewport: HTMLDivElement | null) => void;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextType>(SCROLLAREA_NAME);

//
// Root
//

const SCROLLAREA_ROOT_NAME = 'ScrollArea.Root';

type ScrollAreaRootProps = Partial<ScrollAreaOptions>;

/**
 * ScrollArea provides native scrollbars with custom styling.
 */
const ScrollAreaRoot = slottable<HTMLDivElement, ScrollAreaRootProps>(
  (
    {
      children,
      asChild,
      orientation = 'vertical',
      autoHide = true,
      scrollbars = true,
      centered = false,
      padding = false,
      thin = false,
      snap = false,
      overlay = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const density = thin ? scrollbar.md : scrollbar.lg;
    const options = useMemo(
      () => ({ orientation, autoHide, scrollbars, centered, padding, thin, snap, overlay }),
      [orientation, autoHide, scrollbars, centered, padding, thin, snap, overlay],
    );

    return (
      <ScrollAreaProvider {...options} density={density} setViewport={setViewport}>
        <Comp {...rest} className={tx('scrollArea.root', options, className)} ref={forwardedRef}>
          {children}
          {/* Slot forwards to a single child, so overlay thumbs are only available on a real element. */}
          {overlay && scrollbars && !asChild && viewport && (
            <ScrollAreaThumbs viewport={viewport} orientation={orientation} density={density} autoHide={autoHide} />
          )}
        </Comp>
      </ScrollAreaProvider>
    );
  },
);

ScrollAreaRoot.displayName = SCROLLAREA_ROOT_NAME;

//
// Viewport
//

const SCROLLAREA_VIEWPORT_NAME = 'ScrollArea.Viewport';

type ScrollAreaViewportProps = SlottableProps;

const ScrollAreaViewport = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const options = useScrollAreaContext(SCROLLAREA_VIEWPORT_NAME);
  const { density, setViewport } = options;
  const { className, ...rest } = composableProps(props);
  const { style, ...restWithoutStyle } = rest as { style?: CSSProperties; [key: string]: any };
  const Comp = asChild ? Slot : Primitive.div;
  const ref = useComposedRefs(forwardedRef, setViewport);

  return (
    <Comp
      {...restWithoutStyle}
      style={
        {
          // In overlay mode the native scrollbar is hidden, so it reserves no width.
          '--scroll-width': options.scrollbars && !options.overlay ? `${density.size}px` : '0px',
          '--scroll-padding': options.scrollbars ? `${density.padding}px` : '0px',
          ...style,
        } as CSSProperties
      }
      className={tx('scrollArea.viewport', options, className)}
      ref={ref}
    >
      {children}
    </Comp>
  );
});

ScrollAreaViewport.displayName = SCROLLAREA_VIEWPORT_NAME;

//
// ScrollArea
//

export const ScrollArea = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
};

export type { ScrollAreaRootProps, ScrollAreaViewportProps };
