//
// Copyright 2025 DXOS.org
//

import { Fallback, Json } from './components';
import { type XmlComponentRegistry } from './extensions';
import { PromptWidget, ReferenceWidget, SelectWidget, SuggestionWidget, SummaryWidget } from './widgets';

// TODO(burdon): Move to plugin.

export const registry = {
  //
  // Element
  //

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

  ['prompt' as const]: {
    block: true,
    factory: (props) => {
      const text = props.children?.[0];
      return typeof text === 'string' ? new PromptWidget(text) : null;
    },
  },
  ['reference' as const]: {
    block: false,
    factory: (props) => {
      return new ReferenceWidget(props.children?.[0]);
    },
  },
  ['select' as const]: {
    block: true,
    factory: (props) => {
      return new SelectWidget(props.children);
    },
  },
  ['suggestion' as const]: {
    block: true,
    factory: (props) => {
      return new SuggestionWidget(props.children?.[0]);
    },
  },
  ['summary' as const]: {
    block: true,
    factory: (props) => {
      const text = props.children?.[0];
      return typeof text === 'string' ? new SummaryWidget(text) : null;
    },
  },

  //
  // React
  // TODO(thure): Convert all but components rendering a `Surface` to a Lit widget.
  //

  ['json' as const]: {
    block: true,
    // TODO(thure): Whether this renders a `Surface` (must remain React) or a `ToggleContainer` (can become Lit) depends on its `disposition`, what to do here?
    Component: Json,
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
