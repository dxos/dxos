//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { useSvgContext } from '../hooks';

export interface SVGProps {
  children?: ReactNode | ReactNode[];
}

/**
 * SVG wrapper.
 * @param children
 * @constructor
 */
export const SVG = ({
  children,
}: SVGProps) => {
  const context = useSvgContext();
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      ref={context.ref}
    >
      {children}
    </svg>
  );
};
