//
// Copyright 2022 DXOS.org
//

import { select } from 'd3';
import React, {
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type SVGContextOptions, SVGContext, SVGContextProvider } from '../../hooks';

export type RootProps = ThemedClassName<PropsWithChildren<SVGContextOptions & ComponentPropsWithoutRef<'div'>>>;

/**
 * Makes the SVG context available to child nodes.
 * Automatically resizes the SVG element, which expands to fit the container.
 *
 * NOTE: Uses `ResizeObserver` directly rather than `react-resize-detector` — the latter's
 * `useResizeDetector` was flaky in our Storybook environment (sometimes never fired its
 * initial measurement), leaving the SVG stuck at `opacity-0` with no rendered content.
 */
export const Root = forwardRef<SVGContext, RootProps>(({ children, scale, centered, ...props }, ref) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const { width, height } = size;

  const context = useMemo<SVGContext>(() => {
    return new SVGContext({ scale, centered });
  }, [scale, centered]);

  useImperativeHandle(ref, () => context, [context]);

  useEffect(() => {
    if (width && height) {
      context.setSize({ width, height });
      select(context.svg)
        .attr('display', 'block')
        .attr('viewBox', context.viewBox)
        .attr('width', width)
        .attr('height', height);
    }
  }, [context, width, height]);

  const ready = width !== 0 && height !== 0;

  return (
    <SVGContextProvider value={context}>
      <div {...composableProps(props, { classNames: 'dx-expander' })} ref={setContainer}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          ref={context.ref}
          className={mx('transition-opacity opacity-0 duration-1000', ready && 'opacity-100')}
        >
          {ready && children}
        </svg>
      </div>
    </SVGContextProvider>
  );
});
