//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import * as StoryEmbed from '@dxos/storybook-testing/StoryEmbed';

import { STORIES, pageRuntime, pinDarkAppearance } from './stories.ts';

export type StoryDemoProps = {
  id: string;
  /** Starts peers of the story's own instead of joining the page's. */
  standalone?: boolean;
};

/** A live demo island: `<StoryDemo id='editor' client:only='react' />`. */
export const StoryDemo = ({ id, standalone }: StoryDemoProps) => {
  const entry = STORIES[id];
  if (!entry) {
    throw new Error(`No demo "${id}"`);
  }

  // The page's peers start before the story module arrives, so joining overlaps with the download.
  const [runtime] = useState(() => {
    pinDarkAppearance();
    return standalone ? undefined : pageRuntime();
  });
  const [story, setStory] = useState<StoryEmbed.Composed>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    entry
      .load()
      .then((module) => StoryEmbed.compose(module, entry.name))
      // A composed story is a function, which `setStory` would call as an updater.
      .then(
        (composed) => setStory(() => composed),
        (error) => setError(String(error)),
      );
  }, [entry]);

  if (error) {
    return <p role='alert'>{error}</p>;
  }
  if (!story) {
    return null;
  }

  return (
    <StoryEmbed.Root
      story={story}
      shared={runtime && { runtime, late: entry.late }}
      classNames='h-full border border-separator'
    />
  );
};
