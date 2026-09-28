//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator } from '@storybook/react-vite';
import React, { memo, useMemo } from 'react';

import { AtomEx } from '@dxos/effect';

/**
 * Adds Effect Atom registry context for storybook.
 */
export const withRegistry: Decorator = (Story) => {
  const registry = useMemo(() => AtomEx.makeRegistry(), []);

  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);

  return (
    <RegistryContext.Provider value={registry}>
      <MemoizedStory />
    </RegistryContext.Provider>
  );
};
