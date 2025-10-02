//
// Copyright 2022 DXOS.org
//

import { select } from 'd3';
import React, { useEffect, useRef } from 'react';

import { createMarkers } from '../../graph';

export type MarkersProps = {
  arrowSize?: number;
  className?: string;
};

/**
 * SVG markers wrapper.
 */
export const Markers = ({ arrowSize, className }: MarkersProps) => {
  const ref = useRef(null);
  useEffect(() => {
    select(ref.current).call(createMarkers({ arrowSize }));
  }, [ref]);

  return <defs ref={ref} className={className} />;
};
