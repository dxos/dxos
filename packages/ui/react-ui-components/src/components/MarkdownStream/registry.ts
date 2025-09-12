//
// Copyright 2025 DXOS.org
//

import { Fallback, Suggest } from './components';
import { type XmlComponentRegistry } from './extensions';
import { ElementWidgetFactory, PromptWidgetFactory, SummaryWidgetFactory } from './widgets';

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
