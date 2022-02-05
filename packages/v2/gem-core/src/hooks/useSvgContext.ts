//
// Copyright 2022 DXOS.org
//

import { createContext, useContext } from 'react';

import { SVGContext } from '../context';

export const SVGContextDef = createContext<SVGContext>(undefined);

/**
 * Get SVG context from the React context.
 */
export const useSvgContext = (): SVGContext => {
  return useContext<SVGContext>(SVGContextDef);
}
