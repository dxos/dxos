//
// Copyright 2022 DXOS.org
//

import { select } from 'd3';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { SVGContext, type SVGContextOptions, SVGContextProvider } from '../../hooks';

export type RootProps = ThemedClassName<PropsWithChildren<SVGContextOptions>>;

/**
 * Makes the SVG context available to child nodes.
 * Automatically resizes the SVG element, which expands to fit the container.
 */
export const Root = forwardRef<SVGContext, RootProps>(({ classNames, children, ...props }, ref) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });

  const context = useMemo<SVGContext>(() => {
    return new SVGContext(props);
  }, [props.scale, props.centered]);

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
      <div ref={containerRef} className={mx('grid grow overflow-hidden', classNames)}>
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
