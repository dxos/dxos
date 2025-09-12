//
// Copyright 2025 DXOS.org
//

import { Fallback } from './components';
import { type XmlComponentRegistry } from './extensions';
import { PromptWidget, ReferenceWidget, SelectWidget, SuggestionWidget, SummaryWidget } from './widgets';

// TODO(thure): Tags with a definition in the `ContentBlock` namespace (`message.ts` in `sdk/schema`),
//  which don’t appear to be handled by extant rendering logic
//  (maybe intentionally, just might want to mark them as “won’t-implement” here for clarity):
//   - 'anchor'
//   - 'reference'
//   - 'file'
//   - 'image'
//   - 'proposal'
//   - 'reasoning'
//   - 'status'
//   - 'transcript'

const getTextChild = (children: any[]): string | null => {
  const child = children?.[0];
  return typeof child === 'string' ? child : null;
};

/**
 * Custom XML tags registry.
 */
// TODO(burdon): Move to plugin.
export const registry: XmlComponentRegistry = {
  //
  // Widgets
  //

  ['prompt' as const]: {
    block: true,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new PromptWidget(text) : null;
    },
  },
  ['reference' as const]: {
    block: false,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new ReferenceWidget(text) : null;
    },
  },
  ['select' as const]: {
    block: true,
    factory: (props) => {
      const options = props.children
        ?.map((option: any) => option.tag === 'option' && getTextChild(option.children))
        .filter(Boolean);
      return options?.length ? new SelectWidget(options) : null;
    },
  },
  ['suggest' as const]: {
    block: true,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new SuggestionWidget(text) : null;
    },
  },
  ['summary' as const]: {
    block: true,
    factory: (props) => {
      const text = getTextChild(props.children);
      return text ? new SummaryWidget(text) : null;
    },
  },

  //
  // React
  // TODO(thure): Convert all but components rendering a `Surface` to a Lit widget.
  //

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
};
