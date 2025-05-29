//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useGrid } from '../hooks';

export type GridSlots = {
  path?: {
    className?: string;
  };
};

export type GridProps = {
  axis?: boolean;
  className?: string;
  slots?: GridSlots;
};

/**
 * SVG grid wrapper.
 * @constructor
 */
export const Grid = ({ axis, className }: GridProps) => {
  const { ref } = useGrid({ axis });

  return <g ref={ref} className={className} />;
};
