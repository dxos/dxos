//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { useSvgContext } from '../hooks/index.js';

export interface SVGProps {
  children?: ReactNode
  className?: string
}

/**
 * SVG wrapper.
 */
export const SVG = ({
  children,
  className
}: SVGProps) => {
  const context = useSvgContext();
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      ref={context.ref}
      className={className}
    >
      {children}
    </svg>
  );
};
