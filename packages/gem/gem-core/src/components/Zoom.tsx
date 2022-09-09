//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { defaultGridStyles } from '../styles';
import { useZoom, ZoomExtent } from '../hooks';

export interface ZoomProps {
  extent?: ZoomExtent
  className?: string
  children?: ReactNode
}

/**
 * SVG zoomable component wrapper.
 * @constructor
 */
export const Zoom = ({
  extent,
  className = defaultGridStyles,
  children
}: ZoomProps) => {
  const zoom = useZoom({ extent });

  return (
    <g ref={zoom.ref} className={className}>
      {children}
    </g>
  );
};
