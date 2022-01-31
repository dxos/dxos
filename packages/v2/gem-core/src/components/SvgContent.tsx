//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { SvgContext } from '../context';
import { useSvgContext, useZoom, ZoomExtent } from '../hooks';

export interface SvgContentProps {
  children?: ReactNode | ReactNode[] | undefined
  render?: (context: SvgContext) => ReactNode
  zoom?: ZoomExtent
}

/**
 * Container wrapping the context.
 * @param children
 * @param render
 * @param zoom
 * @constructor
 */
export const SvgContent = ({ children, render, zoom }: SvgContentProps) => {
  const context = useSvgContext();
  const ref = useZoom(context, { extent: zoom });

  return (
    <g ref={ref}>
      {children}
      {render?.(context)}
    </g>
  );
};
