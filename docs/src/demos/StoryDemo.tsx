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

import { type BootTurn, STORIES, pageRuntime, pinDarkAppearance, queueBoot } from './stories.ts';

export type StoryDemoProps = {
  id: string;
  /** Starts peers of the story's own instead of joining the page's. */
  standalone?: boolean;
  /** Boots after the page's other demos show, active tab panel (`[data-panel]`) first. */
  lazy?: boolean;
  /** Called once the demo shows on every peer. */
  onReady?: () => void;
};

/** A live demo island: `<StoryDemo id='editor' client:only='react' />`. */
export const StoryDemo = ({ id, standalone, lazy, onReady }: StoryDemoProps) => {
  const entry = STORIES[id];
  if (!entry) {
    throw new Error(`No demo "${id}"`);
  }

  // The page's peers start before the story module arrives, so joining overlaps with the download.
  const [runtime] = useState(() => {
    pinDarkAppearance();
    return standalone ? undefined : pageRuntime();
  });
  const panel = usePanelOpened(lazy);
  // Queued after mount, so the panel's visibility can be read when the first turn is given.
  const [slot, setSlot] = useState<BootTurn>();
  useEffect(() => {
    if (lazy) {
      setSlot(queueBoot(() => panel.ref.current?.closest('[data-panel]')?.hasAttribute('data-active') ?? false));
    }
  }, []);
  const [turn, setTurn] = useState(false);
  useEffect(() => {
    void slot?.turn.then(() => setTurn(true));
  }, [slot]);

  const [story, setStory] = useState<StoryEmbed.Composed>();
  const [error, setError] = useState<string>();
  const boot = panel.opened || turn;
  useEffect(() => {
    if (!boot) {
      return;
    }
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
  }, [entry, boot]);

  if (error) {
    return <p role='alert'>{error}</p>;
  }
  if (!boot) {
    return <div ref={panel.ref} hidden />;
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
      shared={{
        runtime,
        late: entry.late,
        onReady: () => {
          slot?.done();
          onReady?.();
        },
      }}
      classNames='h-full border border-separator'
    />
  );
};

const usePanelOpened = (lazy = false) => {
  const ref = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(!lazy);
  useEffect(() => {
    const panel = ref.current?.closest<HTMLElement>('[data-panel]');
    if (opened || !panel) {
      return;
    }
    const check = () => panel.hasAttribute('data-active') && setOpened(true);
    const observer = new MutationObserver(check);
    observer.observe(panel, { attributes: true, attributeFilter: ['data-active'] });
    check();
    return () => observer.disconnect();
  }, [opened]);

  return { ref, opened };
};
