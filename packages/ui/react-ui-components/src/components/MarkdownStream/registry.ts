//
// Copyright 2025 DXOS.org
//

import { Fallback, Prompt, Suggest } from './components';
import { type XmlComponentRegistry } from './extensions';

/**
 * Custom XML tags registry.
 */
export const registry: XmlComponentRegistry = {
  //
  // Element (lit)
  //

  ['dx-ref-tag' as const]: {
    type: 'element',
  },

  //
  // React
  //

  ['prompt' as const]: {
    type: 'react',
    Component: Prompt,
  },
  ['select' as const]: {
    type: 'react',
    Component: Fallback,
  },
  ['suggest' as const]: {
    type: 'react',
    Component: Suggest,
  },
  ['toolkit' as const]: {
    type: 'react',
    Component: Fallback,
  },
} as const;
