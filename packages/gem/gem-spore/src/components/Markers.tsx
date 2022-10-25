//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { createMarkers } from '../graph';
import { defaultMarkerStyles } from './styles';

export interface MarkersProps {
  className?: string;
}

/**
 * SVG markers wrapper.
 * @constructor
 */
export const Markers = ({ className = defaultMarkerStyles }: MarkersProps) => {
  const ref = useRef();
  useEffect(() => {
    d3.select(ref.current).call(createMarkers());
  }, [ref]);

  return <defs ref={ref} className={className} />;
};
