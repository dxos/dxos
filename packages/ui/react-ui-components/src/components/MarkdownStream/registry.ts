//
// Copyright 2025 DXOS.org
//

import { Fallback } from './components';
import { ElementWidgetFactory, type XmlComponentRegistry } from './extensions';

// TODO(burdon): Move to plugin.

/**
 * Custom XML tags registry.
 */
// TODO(thure): Tags with a definition in the `ContentBlock` namespace (`message.ts` in `sdk/schema`) which don’t appear to be handled by extant rendering logic (maybe intentionally, just might want to mark them as “won’t-implement” here for clarity):
//   - 'anchor'
//   - 'reference'
//   - 'file'
//   - 'image'
//   - 'proposal'
//   - 'reasoning'
//   - 'status'
//   - 'transcript'

export const registry = {
  //
  // Element
  //

  ['reference' as const]: {
    block: false,
    factory: ElementWidgetFactory,
  },
  ['summary' as const]: {
    block: true,
    factory: ElementWidgetFactory,
  },
  ['prompt' as const]: {
    block: true,
    factory: ElementWidgetFactory,
  },
  ['select' as const]: {
    block: true,
    factory: ElementWidgetFactory,
  },
  ['suggestion' as const]: {
    block: true,
    factory: ElementWidgetFactory,
  },
  // TODO(thure): Does `'text' as const` need to be registered, or is that just inherently handled by `MarkdownStream`?

  //
  // React
  //
  // TODO(thure, paraphrasing burdon): Convert all but components rendering a `Surface` to a Lit widget.

  ['json' as const]: {
    block: true,
    // TODO(thure): Whether this renders a `Surface` (must remain React) or a `ToggleContainer` (can become Lit) depends on its `disposition`, what to do here?
    Component: Fallback,
  },
  ['toolCall' as const]: {
    block: true,
    Component: Fallback,
  },
  ['toolResult' as const]: {
    block: true,
    Component: Fallback,
  },
  ['toolkit' as const]: {
    block: true,
    Component: Fallback,
  },
} satisfies XmlComponentRegistry;
