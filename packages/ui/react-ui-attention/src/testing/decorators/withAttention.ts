//
// Copyright 2024 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { type Decorator } from '@storybook/react';
import { createElement, useMemo } from 'react';

import { AttentionManager } from '../../attention';
import { RootAttentionProvider, SelectionProvider } from '../../components';

/**
 * Storybook decorator that provides attention context.
 * @param initialAttendedId Optional ID to set as initially attended.
 */
export const withAttention = (initialAttendedId?: string): Decorator => {
  return (Story) => {
    const registry = useMemo(() => Registry.make(), []);
    const attention = useMemo(
      () => (initialAttendedId ? new AttentionManager(registry, [initialAttendedId]) : undefined),
      [registry],
    );
    return createElement(
      RegistryContext.Provider,
      { value: registry },
      createElement(RootAttentionProvider, { attention }, createElement(SelectionProvider, {}, createElement(Story))),
    );
  };
};
