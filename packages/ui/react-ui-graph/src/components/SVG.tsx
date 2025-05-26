//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useSvgContext } from '../hooks';

export type SVGProps = PropsWithChildren<ThemedClassName>;

/**
 * SVG wrapper.
 */
export const SVG = ({ children, classNames }: SVGProps) => {
  const { ref } = useSvgContext();
  return (
    <svg xmlns='http://www.w3.org/2000/svg' ref={ref} className={mx(classNames)}>
      {children}
    </svg>
  );
};
