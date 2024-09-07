//
// Copyright 2022 DXOS.org
//

import React, { type ReactNode } from 'react';

import { useZoom, type ZoomExtent } from '../hooks';

export interface ZoomProps {
  extent?: ZoomExtent;
  className?: string;
  children?: ReactNode;
}

/**
 * SVG zoomable component wrapper.
 */
export const Zoom = ({ extent, className, children }: ZoomProps) => {
  const zoom = useZoom({ extent });

  return (
    <g ref={zoom.ref as any} className={className}>
      {children}
    </g>
  );
};
