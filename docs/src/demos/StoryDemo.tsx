//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { useEffect, useRef, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';
import * as StoryEmbed from '@dxos/storybook-testing/StoryEmbed';

import { STORIES, pageRuntime, pinDarkAppearance } from './stories.ts';

export type StoryDemoProps = {
  id: string;
  /** Starts peers of the story's own instead of joining the page's. */
  standalone?: boolean;
  /** Boots once the enclosing tab panel (`[data-panel]`) is `data-active`, so hidden tabs leave the shown one the CPU. */
  lazy?: boolean;
};

/** A live demo island: `<StoryDemo id='editor' client:only='react' />`. */
export const StoryDemo = ({ id, standalone, lazy }: StoryDemoProps) => {
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

  const active = usePanelActive(lazy);

  if (error) {
    return <p role='alert'>{error}</p>;
  }
  if (!active.shown) {
    return <div ref={active.ref} hidden />;
  }
  if (!story) {
    return (
      <div role='status' className='grid h-full place-items-center border border-separator text-description'>
        Loading…
      </div>
    );
  }

  return (
    <StoryEmbed.Root
      story={story}
      shared={runtime && { runtime, late: entry.late }}
      classNames='h-full border border-separator'
    />
  );
};

/** Whether the tab panel around the returned ref has been shown; stays true once it has. */
const usePanelActive = (lazy = false) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(!lazy);
  useEffect(() => {
    const panel = ref.current?.closest<HTMLElement>('[data-panel]');
    if (shown || !panel) {
      setShown(true);
      return;
    }
    const check = () => panel.hasAttribute('data-active') && setShown(true);
    const observer = new MutationObserver(check);
    observer.observe(panel, { attributes: true, attributeFilter: ['data-active'] });
    check();
    return () => observer.disconnect();
  }, [shown]);

  return { ref, shown };
};
