//
// Copyright 2024 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { createElement } from 'react';

import { RootAttentionProvider } from '../../components';

export const withAttention: Decorator = (Story) => createElement(RootAttentionProvider, {}, createElement(Story));
