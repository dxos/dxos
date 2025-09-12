//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';

import { type XmlComponentProps } from '../extensions';

export type SuggestProps = XmlComponentProps<{ children: string[] }>;

// TODO(burdon): Reconcile with ChatMessage.
// TODO(burdon): Implement intent handler and migrate to lit.
export const Suggest = ({ children }: SuggestProps) => {
  const text = children?.[0];
  if (typeof text !== 'string') {
    return null;
  }

  return <IconButton icon='ph--lightning--regular' label={text} />;
};
