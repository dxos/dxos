//
// Copyright 2022 DXOS.org
//

import React, { type ReactNode } from 'react';

import { useSvgContext } from '../hooks';

export interface SVGProps {
  children?: ReactNode;
  className?: string;
}

/**
 * SVG wrapper.
 */
export const SVG = ({ children, className }: SVGProps) => {
  const { ref } = useSvgContext();
  return (
    <svg xmlns='http://www.w3.org/2000/svg' ref={ref} className={className}>
      {children}
    </svg>
  );
};
