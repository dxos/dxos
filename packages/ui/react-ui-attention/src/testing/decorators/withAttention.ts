//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { createElement } from 'react';

import { RootAttentionProvider, SelectionProvider } from '../../components';

export const withAttention: Decorator = (Story) => {
  return createElement(RootAttentionProvider, {}, createElement(SelectionProvider, {}, createElement(Story)));
};
