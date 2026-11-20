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

import { STORIES, pageRuntime, pinDarkAppearance, queueBoot } from './stories.ts';

export type StoryDemoProps = {
  id: string;
  /** Starts peers of the story's own instead of joining the page's. */
  standalone?: boolean;
  /**
   * Boots in turn, once the demos before it show their content, or as soon as its tab panel (`[data-panel]`) is
   * `data-active`; the shown demo then never shares the CPU with hidden ones, and the hidden ones are ready by the time
   * their tab is picked.
   */
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
  // Islands render in page order, so the queue follows the tabs.
  const [slot] = useState(() => (lazy ? queueBoot() : undefined));
  const [story, setStory] = useState<StoryEmbed.Composed>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    entry
      .load()
      .then((module) => StoryEmbed.compose(module, entry.name))
      // A composed story is a function, which `setStory` would call as an updater.
      .then(
        (composed) => setStory(() => composed),
        (error) => {
          setError(String(error));
          slot?.done();
        },
      );
  }, [entry]);

  const [turn, setTurn] = useState(false);
  useEffect(() => {
    void slot?.turn.then(() => setTurn(true));
  }, [slot]);
  const active = usePanelActive(lazy);

  if (error) {
    return <p role='alert'>{error}</p>;
  }
  if (!active.shown && !turn) {
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
      shared={runtime && { runtime, late: entry.late, onReady: slot?.done }}
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
