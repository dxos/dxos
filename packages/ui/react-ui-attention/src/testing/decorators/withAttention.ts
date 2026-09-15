//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator } from '@storybook/react-vite';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { createElement, useMemo } from 'react';

import { RootAttentionProvider, ViewStateProvider } from '../../components/index.ts';
import { Attention } from '../../types/index.ts';

/**
 * Storybook decorator that provides attention context.
 * @param initialAttendedId Optional ID to set as initially attended.
 */
export const withAttention = (initialAttendedId?: string): Decorator => {
  return (Story) => {
    const registry = useMemo(() => Registry.make(), []);
    const attention = useMemo(
      () => (initialAttendedId ? new Attention.AttentionManager(registry, [initialAttendedId]) : undefined),
      [registry],
    );

    return createElement(
      RegistryContext.Provider,
      { value: registry },
      createElement(RootAttentionProvider, { attention }, createElement(ViewStateProvider, {}, createElement(Story))),
    );
  };
};
