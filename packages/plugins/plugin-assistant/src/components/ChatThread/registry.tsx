//
// Copyright 2025 DXOS.org
//

import React from 'react';

import {
  PromptWidget,
  ReferenceWidget,
  SelectWidget,
  SuggestionWidget,
  SummaryWidget,
  ToggleContainer,
  type XmlComponentProps,
  type XmlComponentRegistry,
} from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';

type FallbackProps = XmlComponentProps<any>;

const Fallback = ({ tag, ...props }: FallbackProps) => {
  return (
    <ToggleContainer.Root classNames='rounded-sm'>
      <ToggleContainer.Header classNames='bg-groupSurface' title={tag} />
      <ToggleContainer.Content classNames='bg-modalSurface'>
        {/* TODO(burdon): Can we avoid the ! */}
        <Json classNames='!p-2 text-sm' data={props} />
      </ToggleContainer.Content>
    </ToggleContainer.Root>
  );
};

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
export const componentRegistry: XmlComponentRegistry = {
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
      return text && props.reference ? new ReferenceWidget(text, props.reference) : null;
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
  ['suggestion' as const]: {
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

  ['toolBlock' as const]: {
    block: true,
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

  //
  // Fallback
  //

  ['json' as const]: {
    block: true,
    Component: Fallback,
  },
};
