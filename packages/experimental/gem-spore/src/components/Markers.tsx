//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { createMarkers } from '../graph';
import { defaultMarkerStyles } from './styles';

export interface MarkersProps {
  arrowSize?: number;
  className?: string;
}

/**
 * SVG markers wrapper.
 * @constructor
 */
export const Markers = ({ arrowSize, className = defaultMarkerStyles }: MarkersProps) => {
  const ref = useRef();
  useEffect(() => {
    d3.select(ref.current).call(createMarkers({ arrowSize }));
  }, [ref]);

  return <defs ref={ref} className={className} />;
};
