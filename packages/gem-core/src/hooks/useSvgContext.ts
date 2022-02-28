//
// Copyright 2022 DXOS.org
//

import { createContext, useContext, useMemo } from 'react';

import { Scale, SVGContext } from '../context';

export const SVGContextDef = createContext<SVGContext>(undefined);

/**
 * Get SVG context from the React context.
 */
export const useSvgContext = (): SVGContext => {
  return useContext<SVGContext>(SVGContextDef);
}

/**
 * Create new context (as hook).
 */
export const createSvgContext = (scale?: Scale): SVGContext => {
  return useMemo(() => new SVGContext(scale), []);
}
