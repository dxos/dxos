//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { useZoom, ZoomExtent } from '../hooks';
import { defaultGridStyles } from '../styles';

export interface ZoomProps {
  extent?: ZoomExtent;
  className?: string;
  children?: ReactNode;
}

/**
 * SVG zoomable component wrapper.
 * @constructor
 */
export const Zoom = ({ extent, className = defaultGridStyles, children }: ZoomProps) => {
  const zoom = useZoom({ extent });

  return (
    <g ref={zoom.ref} className={className}>
      {children}
    </g>
  );
};
