//
// Copyright 2025 DXOS.org
//

import { Fallback, Suggest } from './components';
import {
  ElementWidgetFactory,
  PromptWidgetFactory,
  SummaryWidgetFactory,
  type XmlComponentRegistry,
} from './extensions';

// TODO(burdon): Move to plugin.

/**
 * Custom XML tags registry.
 */
export const registry: XmlComponentRegistry = {
  //
  // Element
  //

  ['dx-ref-tag' as const]: {
    block: false,
    factory: ElementWidgetFactory,
  },
  ['summary' as const]: {
    block: true,
    factory: SummaryWidgetFactory,
  },
  ['prompt' as const]: {
    block: true,
    factory: PromptWidgetFactory,
  },

  //
  // React
  //

  // TODO(burdon): Convert to widget.
  ['select' as const]: {
    block: true,
    Component: Fallback,
  },
  // TODO(burdon): Convert to widget.
  ['suggest' as const]: {
    block: true,
    Component: Suggest,
  },
  ['toolkit' as const]: {
    block: true,
    Component: Fallback,
  },
} as const;
