//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useGrid } from '../hooks';
import { defaultGridStyles } from '../styles';

export type GridSlots = {
  path?: {
    className?: string;
  };
};

export interface GridProps {
  axis?: boolean;
  className?: string;
  slots?: GridSlots;
}

/**
 * SVG grid wrapper.
 * @constructor
 */
export const Grid = ({ axis, className = defaultGridStyles, slots }: GridProps) => {
  const grid = useGrid({ axis });

  return <g ref={grid.ref as any} className={className} />;
};
