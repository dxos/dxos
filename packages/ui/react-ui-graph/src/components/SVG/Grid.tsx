//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGrid } from '../../hooks';

export type GridSlots = {
  path?: {
    className?: string;
  };
};

export type GridProps = ThemedClassName<{
  axis?: boolean;
  slots?: GridSlots;
}>;

/**
 * SVG grid wrapper.
 * @constructor
 */
export const Grid = ({ classNames, axis }: GridProps) => {
  const { ref } = useGrid({ axis });

  return <g ref={ref} className={mx('dx-grid', classNames)} />;
};
