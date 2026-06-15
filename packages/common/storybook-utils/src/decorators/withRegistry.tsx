//
// Copyright 2025 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { type Decorator } from '@storybook/react';
import React, { memo, useMemo } from 'react';

/**
 * Adds Effect Atom registry context for storybook.
 */
export const withRegistry: Decorator = (Story) => {
  const registry = useMemo(() => Registry.make(), []);

  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);

  return (
    <RegistryContext.Provider value={registry}>
      <MemoizedStory />
    </RegistryContext.Provider>
  );
};
