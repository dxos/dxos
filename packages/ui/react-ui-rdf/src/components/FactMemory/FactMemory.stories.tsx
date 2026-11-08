//
// Copyright 2026 DXOS.org
//

/**
 * "Facts are memory for new mail" (`stories-brain/ROADMAP.md` B5), as a surface you can look at.
 *
 * The generated corpus is split by MESSAGE on time: the older messages' facts are written into an in-memory
 * `FactStore`, and the newest messages are held out. The store is then asked what it already knows about the
 * entities the held-out message mentions — so anything it answers is context it supplies, not context it was
 * given. The facts extracted from the message itself are the answer key and stay hidden behind the eye button.
 *
 * - `Default` holds out the newest message against a store built from every message before it.
 * - `Earlier` holds out three, and shows the second — a message whose entities the store knows less about.
 * - `ColdStart` builds the store from nothing, which is what a new install looks like: every entity is new.
 *
 * Test:
 * 1. Read the chips under the body — green is an entity the store has seen, grey is one it has not.
 * 2. Read the right pane before pressing the eye: that is what the inbox could tell you about this message.
 * 3. Press the eye to reveal what the message itself asserts, and compare.
 * 4. In `ColdStart` every chip is grey and the right pane is empty — the contrast the claim rests on.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, FactAnalyticsLive, FactStoreLive } from '@dxos/pipeline-rdf';
import { DEMO_CORPUS, type IncomingMessage, entitiesInMessage, splitCorpus } from '@dxos/pipeline-rdf/testing';
import * as Status from '@dxos/react-ui/Status';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FactMemory, type MessagePreview } from './FactMemory.tsx';

type StoryProps = {
  /** How many of the newest messages to hold out of the store. */
  holdOut: number;
  /** Which held-out message to show (0 is the oldest of them). */
  index?: number;
  /** Write nothing into the store, so every entity in the message is new. */
  coldStart?: boolean;
};

/** The held-out message as the component wants it: prose, the entities it mentions, and the answer key. */
const toPreview = (message: IncomingMessage): MessagePreview => ({
  from: message.fromLabel,
  receivedAt: message.receivedAt,
  body: message.body,
  entities: entitiesInMessage(message),
  facts: message.facts,
});

const DefaultStory = ({ holdOut, index = 0, coldStart = false }: StoryProps) => {
  const { prior, incoming } = useMemo(() => splitCorpus(DEMO_CORPUS, { holdOut }), [holdOut]);
  const message = incoming[Math.min(index, incoming.length - 1)];
  const [analytics, setAnalytics] = useState<FactAnalytics | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const store = FactStoreLive.makeMemory();
    // A cold start writes nothing: the store is real and empty, which is what a new install is.
    void EffectEx.runPromise(store.putFacts(coldStart ? [] : prior)).then(
      () => !cancelled && setAnalytics(FactAnalyticsLive.fromStore(store)),
      (cause: Error) => !cancelled && setError(cause.message),
    );
    return () => {
      cancelled = true;
    };
  }, [prior, coldStart]);

  if (error) {
    return <Status.Empty icon='ph--warning--regular'>{error}</Status.Empty>;
  }
  if (!message) {
    return <Status.Empty>No message held out.</Status.Empty>;
  }
  if (!analytics) {
    return (
      <Status.Empty>
        {coldStart ? 'Opening an empty store…' : `Writing ${prior.length.toLocaleString()} prior facts…`}
      </Status.Empty>
    );
  }
  return <FactMemory.Root analytics={analytics} message={toPreview(message)} />;
};

const meta = {
  title: 'ui/react-ui-rdf/FactMemory',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { holdOut: 1 },
};

/** Three messages held out, showing the oldest of them — less of the corpus precedes it. */
export const Earlier: Story = {
  args: { holdOut: 3, index: 0 },
};

/** The same message against a store that has seen nothing: the contrast the claim rests on. */
export const ColdStart: Story = {
  args: { holdOut: 1, coldStart: true },
};
