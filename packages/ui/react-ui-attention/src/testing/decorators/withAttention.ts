//
// Copyright 2024 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { type Decorator } from '@storybook/react';
import { createElement, useMemo } from 'react';

import { RootAttentionProvider, SelectionProvider } from '../../components';

export const withAttention: Decorator = (Story) => {
  const registry = useMemo(() => Registry.make(), []);
  return createElement(
    RegistryContext.Provider,
    { value: registry },
    createElement(RootAttentionProvider, {}, createElement(SelectionProvider, {}, createElement(Story))),
  );
};
