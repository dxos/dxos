//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { memo } from 'react';

import { ThemeEditor } from '../components/ThemeEditor';

/**
 * Show theme editor.
 */
// TODO(burdon): Ideally move to storybook-addon-theme, but this has a build issue since the addon would depend on the vite theme plugin.
export const withThemeEditor: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);

  return (
    <>
      <MemoizedStory />
      <div className='absolute top-4 bottom-4 right-4 z-10'>
        <div className='h-full is-[35rem] overflow-auto bg-baseSurface border border-separator rounded'>
          <ThemeEditor />
        </div>
      </div>
    </>
  );
};
