//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useGrid } from '../hooks/index.js';
import { defaultGridStyles } from '../styles.js';

export interface GridProps {
  axis?: boolean
  className?: string
}

/**
 * SVG grid wrapper.
 * @constructor
 */
export const Grid = ({
  axis,
  className = defaultGridStyles
}: GridProps) => {
  const grid = useGrid({ axis });

  return (
    <g ref={grid.ref} className={className} />
  );
};
