//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

// A horizontal run of columns sized to the space it has: as many as fit at their minimum width, each an exact share of
// the width, so the visible columns always fill it; past that the run scrolls a column at a time.

//
// Root
//

const ROOT_NAME = 'Columns.Root';

type RootProps = PropsWithChildren<{
  /** The narrowest a column may be, in rem; the count is however many fit at this width. */
  minColumnWidth?: number;
  /** The most columns shown at once, however wide the space. */
  maxColumns?: number;
  /** Space between columns, in rem. */
  gap?: number;
  /** When a column is added, scroll so the newest is in view (a Finder-style drill-down). */
  follow?: boolean;
}>;

/** How many columns of at least `minPx` (with `gapPx` between) fit in `widthPx`, and how wide each is then. */
const fit = (widthPx: number, minPx: number, gapPx: number, maxColumns?: number) => {
  const fits = Math.max(1, Math.floor((widthPx + gapPx) / (minPx + gapPx)));
  const count = maxColumns === undefined ? fits : Math.max(1, Math.min(fits, maxColumns));
  return { count, width: (widthPx - (count - 1) * gapPx) / count };
};

// Composable, so a host's `Panel.Body asChild` makes the scroll frame its growing row.
const Root = Util.composable<HTMLDivElement, RootProps>(
  ({ minColumnWidth = 24, maxColumns, gap = 0, follow = true, children, ...props }, forwardedRef) => {
    const minPx = Hooks.usePx(minColumnWidth);
    const gapPx = Hooks.usePx(gap);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [widthPx, setWidthPx] = useState(0);
    const columns = Children.toArray(children).length;

    // The viewport's content width decides the column width, so it is measured before paint and on every resize.
    useLayoutEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      const measure = () => setWidthPx(viewport.clientWidth);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (follow) {
        viewportRef.current?.scrollTo({ left: viewportRef.current.scrollWidth, behavior: 'smooth' });
      }
    }, [follow, columns]);

    const { width } = fit(widthPx, minPx, gapPx, maxColumns);
    const track: Layout.GridLength = widthPx > 0 ? `${width}px` : `${minColumnWidth}rem`;
    return (
      <ScrollArea.Root {...props} orientation='horizontal' snap autoHide={false} ref={forwardedRef}>
        <ScrollArea.Viewport ref={viewportRef}>
          <Layout.Grid
            cols={Children.map(children, () => track) ?? []}
            rows={['fill']}
            style={{ columnGap: gapPx }}
            // Each column snaps to the viewport's start, so scrolling moves a whole column at a time.
            classNames='h-full [&>*]:snap-start'
          >
            {children}
          </Layout.Grid>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

Root.displayName = ROOT_NAME;

//
// Columns
//

export const Columns = {
  Root,
};

export { fit as fitColumns };

export type { RootProps as ColumnsRootProps };
