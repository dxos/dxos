//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { defaultStyles } from './styles';
import { createMarkers } from '../graph';

export type MarkersProps = {
  arrowSize?: number;
  className?: string;
};

/**
 * SVG markers wrapper.
 * @constructor
 */
export const Markers = ({ arrowSize, className = defaultStyles.markers }: MarkersProps) => {
  const ref = useRef();
  useEffect(() => {
    d3.select(ref.current).call(createMarkers({ arrowSize }));
  }, [ref]);

  return <defs ref={ref} className={className} />;
};
