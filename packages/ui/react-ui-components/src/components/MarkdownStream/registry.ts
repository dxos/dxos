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
// TODO(thure): Tags with a definition in the `ContentBlock` namespace (`message.ts` in `sdk/schema`) which don’t appear to be handled by extant rendering logic (maybe intentionally, just might want to mark them as “won’t-implement” here for clarity):
//   - 'anchor'
//   - 'reference'
//   - 'file'
//   - 'image'
//   - 'proposal'
//   - 'reasoning'
//   - 'status'
//   - 'transcript'

export const registry: XmlComponentRegistry = {
  //
  // Element
  //

  // TODO(thure): Should this not use the 'reference' tag?
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
  ['select' as const]: {
    block: true,
    Component: Fallback,
  },
  // TODO(thure): `ChatMessage.tsx` L166 uses 'suggestion', is this a typo?
  ['suggest' as const]: {
    block: true,
    Component: Suggest,
  },
  ['toolCall' as const]: {
    block: true,
    // TODO(thure): Should use ToolBlock, but that is currently in a downstream package `plugin-assistant`.
    Component: Fallback,
  },
  ['toolResult' as const]: {
    block: true,
    // TODO(thure): Should also use ToolBlock, but that is currently in a downstream package `plugin-assistant`.
    Component: Fallback,
  },
  ['toolkit' as const]: {
    block: true,
    Component: Fallback,
  },
} as const;
