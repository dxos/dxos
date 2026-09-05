//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { CSSProperties, useMemo, useState } from 'react';

import { createContext, useComposedRefs } from '@dxos/react-hooks';
import { type AllowedAxis, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composable, composableProps, slottable } from '../../util';
import { ScrollAreaThumbs } from './ScrollAreaThumbs';
import { type ScrollbarDensity, scrollbar } from './scrollbar';

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
  /** Enable snap scrolling; the content must carry its own snap alignment (e.g. `snap-start`). */
  snap: boolean;
  /** Use the native scrollbar, which reserves layout width, instead of an overlay thumb. */
  native: boolean;
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
 * The root owns its element: the overlay thumbs render beside the children inside it, so it has no
 * `asChild` — a consumer that needs to be the scroll root nests the viewport in it instead.
 */
const ScrollAreaRoot = composable<HTMLDivElement, ScrollAreaRootProps>(
  (
    {
      children,
      orientation = 'vertical',
      autoHide = true,
      scrollbars = true,
      centered = false,
      padding = false,
      thin = false,
      snap = false,
      native = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const density = thin ? scrollbar.md : scrollbar.lg;
    const options = useMemo(
      () => ({ orientation, autoHide, scrollbars, centered, padding, thin, snap, native }),
      [orientation, autoHide, scrollbars, centered, padding, thin, snap, native],
    );

    return (
      <ScrollAreaProvider {...options} density={density} setViewport={setViewport}>
        <div {...rest} className={tx('scrollArea.root', options, className)} ref={forwardedRef}>
          {children}
          {!native && scrollbars && viewport && (
            <ScrollAreaThumbs viewport={viewport} orientation={orientation} density={density} autoHide={autoHide} />
          )}
        </div>
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

/** The custom properties the viewport publishes for the theme to size padding against. */
type ScrollAreaVars = CSSProperties & {
  '--scroll-width': string;
  '--scroll-padding': string;
  '--scroll-strip': string;
};

const ScrollAreaViewport = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const options = useScrollAreaContext(SCROLLAREA_VIEWPORT_NAME);
  const { density, setViewport } = options;
  const { className, style, ...rest } = composableProps(props);
  const ref = useComposedRefs(forwardedRef, setViewport);
  const vars: ScrollAreaVars = {
    '--scroll-width': options.scrollbars ? `${density.size}px` : '0px',
    '--scroll-padding': options.scrollbars ? `${density.padding}px` : '0px',
    // Width of the strip the overlay thumb occupies: its thickness inset at both ends.
    '--scroll-strip': options.scrollbars ? `${density.size + density.padding * 2}px` : '0px',
    ...style,
  };

  return (
    <ark.div
      asChild={asChild}
      {...rest}
      style={vars}
      className={tx('scrollArea.viewport', options, className)}
      ref={ref}
    >
      {children}
    </ark.div>
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
