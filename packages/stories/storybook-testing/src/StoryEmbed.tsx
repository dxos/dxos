//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Meta, composeStory } from '@storybook/react-vite';
import React from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName, type ThemeMode } from '@dxos/ui-types';

import * as StoryPeers from './StoryPeers.ts';

/** A story file's exports: its meta and its stories. */
export type Module = { readonly default: Meta<any> } & Record<string, unknown>;

export type Composed = ReturnType<typeof composeStory>;

export type ComposeOptions = {
  /** The `theme` global the story's decorators read; dark unless given. */
  theme?: ThemeMode;
};

/** Applies a story's meta, args, decorators and loaders outside Storybook, ready to render. */
export const compose = async (
  module: Module,
  name: string,
  { theme = 'dark' }: ComposeOptions = {},
): Promise<Composed> => {
  const story = module[name];
  if (!story) {
    throw new Error(`No story "${name}"`);
  }
  // A module's story exports are typed by its meta, which the record of exports cannot carry.
  const composed = composeStory(
    story as Parameters<typeof composeStory>[0],
    module.default,
    {
      initialGlobals: { theme },
    },
    name,
  );
  await composed.load();
  return composed;
};

export type RootProps = ThemedClassName<{
  story: Composed;
  /** Args over the story's own, such as turning off a debug panel. */
  args?: Record<string, unknown>;
  /** A runtime the page shares between its stories, instead of each starting clients of its own. */
  shared?: StoryPeers.Shared;
}>;

/**
 * Renders a composed story in place. Story layouts are `fixed inset-0`; a transform makes them fill this element
 * instead of the viewport, and it needs a height from its container. Safari lays them out inside layout containment
 * but composites them against the viewport, so after a scroll it leaves them blank or black.
 */
export const Root = ({ story: Story, args, shared, classNames }: RootProps) => {
  const content = (
    <div className={mx('relative overflow-hidden [transform:translateZ(0)]', classNames)}>
      <Story {...args} />
    </div>
  );

  return shared ? (
    <StoryPeers.Provider runtime={shared.runtime} late={shared.late}>
      {content}
    </StoryPeers.Provider>
  ) : (
    content
  );
};
