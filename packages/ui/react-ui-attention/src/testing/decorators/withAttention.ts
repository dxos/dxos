//
// Copyright 2023 DXOS.org
//

import { type Decorator, type StoryFn } from '@storybook/react';
import { createElement } from 'react';

import { RootAttentionProvider } from '../../components';

export const withAttention: Decorator = (Story: StoryFn) => {
  return createElement(RootAttentionProvider, { children: createElement(Story) });
};
