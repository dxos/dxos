//
// Copyright 2022 DXOS.org
//

import { select } from 'd3';
import React, { useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { createMarkers } from '../../graph/index.ts';

export type MarkersProps = ThemedClassName<{
  arrowSize?: number;
}>;

/**
 * SVG markers wrapper.
 */
export const Markers = ({ arrowSize, classNames }: MarkersProps) => {
  const ref = useRef(null);
  useEffect(() => {
    select(ref.current).call(createMarkers({ arrowSize }));
  }, [ref]);

  return <defs ref={ref} className={mx(classNames)} />;
};
