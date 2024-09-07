//
// Copyright 2022 DXOS.org
//

import { createContext, useContext, useState } from 'react';

import { type Scale, SVGContext } from '../context';

export const SVGContextDef = createContext<SVGContext | undefined>(undefined);

/**
 * Create new context (as hook).
 */
export const createSvgContext = (scale?: Scale): SVGContext => {
  const [context] = useState(new SVGContext(scale, false));
  return context;
};

/**
 * Get SVG context from the React context.
 */
export const useSvgContext = (): SVGContext => {
  return useContext(SVGContextDef)!;
};
