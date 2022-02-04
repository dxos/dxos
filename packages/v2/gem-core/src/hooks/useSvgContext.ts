//
// Copyright 2022 DXOS.org
//

import { createContext, useContext } from 'react';

import { SvgContext } from '../context';

export const SvgContextDef = createContext<SvgContext>(undefined);

/**
 * Get SVG context from the React context.
 */
export const useSvgContext = (): SvgContext => {
  return useContext<SvgContext>(SvgContextDef);
}
