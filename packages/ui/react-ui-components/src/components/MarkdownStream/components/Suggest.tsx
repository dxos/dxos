//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';

import { type XmlComponentProps } from '../extensions';

export type SuggestProps = XmlComponentProps<{ children: string[] }>;

// TODO(burdon): Reconcile with ChatMessage.
export const Suggest = ({ children, onEvent }: SuggestProps) => {
  const text = children?.[0];
  if (typeof text !== 'string') {
    return null;
  }

  return <IconButton icon='ph--lightning--regular' label={text} onClick={() => onEvent?.({ type: 'submit', text })} />;
};
