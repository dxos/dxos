//
// Copyright 2026 DXOS.org
//

/**
 * The retraction demo: an agent that learned something wrong, corrected without losing what it used to think.
 *
 * A real in-memory `FactStore` is seeded with the generated corpus plus one planted stale claim — Alice's agent
 * read an old thread and concluded Hugo Marchand works at Helios Capital, hedged (`PR+`), back in May. The
 * correction a later message supports is held out of the store until you press the button.
 *
 * - `Correction` is the demo: press `Correct from msg-0135` and the answer changes.
 * - `Corrected` starts after the correction, for a screenshot of the end state.
 * - `Retraction` withdraws the stale claim instead of replacing it: nothing stands, and the claim is still there.
 *
 * Test:
 * 1. Read the answer: Helios Capital, cited to Alice Chen and `dxn:gmail:msg-0092`, dated 2026-05-30.
 * 2. Press the button. The answer becomes DXOS, cited to Bob Mehta and a newer message.
 * 3. Read the claims below: the Helios claim is still listed, struck through and marked `superseded`, with its
 *    original author and date. Nothing was deleted — a `current` query simply stops returning it.
 * 4. In `Retraction`, the answer reads `Nothing stands.` while the withdrawn claim stays in the list.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, FactAnalyticsLive, FactStoreLive, RDF } from '@dxos/pipeline-rdf';
import { beliefDemo } from '@dxos/pipeline-rdf/testing';
import * as Status from '@dxos/react-ui/Status';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FactBelief } from './FactBelief.tsx';

type StoryProps = {
  /** Whether the correction replaces the stale claim or merely withdraws it. */
  mode: 'supersede' | 'retract';
  /** Write the correction up front, so the story opens on the end state. */
  applied?: boolean;
};

const DEMO = beliefDemo();

/** A withdrawal that takes the stale claim back without putting anything in its place. */
const WITHDRAWAL = RDF.Graph.retract(
  {
    ...DEMO.correction,
    id: 'belief-withdrawal',
    supersedes: undefined,
    assertion: {
      subject: DEMO.correction.assertion.subject,
      predicate: 'has note',
      object: { kind: 'literal', literal: 'withdrawn: the thread was stale and nobody has confirmed since' },
      quote: 'Taking this one back — I cannot find anything that still supports it.',
    },
  },
  DEMO.stale,
);

const DefaultStory = ({ mode, applied = false }: StoryProps) => {
  const [analytics, setAnalytics] = useState<FactAnalytics | undefined>(undefined);
  const [store, setStore] = useState<ReturnType<typeof FactStoreLive.makeMemory> | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const correcting = useMemo(() => (mode === 'retract' ? WITHDRAWAL : DEMO.correction), [mode]);

  useEffect(() => {
    let cancelled = false;
    const opened = FactStoreLive.makeMemory();
    const seed = applied ? [...DEMO.prior, correcting] : DEMO.prior;
    void EffectEx.runPromise(opened.putFacts(seed)).then(
      () => {
        if (!cancelled) {
          setStore(opened);
          setAnalytics(FactAnalyticsLive.fromStore(opened));
        }
      },
      (cause: Error) => !cancelled && setError(cause.message),
    );
    return () => {
      cancelled = true;
    };
  }, [applied, correcting]);

  const apply = useCallback(() => {
    if (!store) {
      return;
    }
    // The correction is a new fact, not an edit: the store is append-only, so nothing is rewritten.
    void EffectEx.runPromise(store.putFacts([correcting])).then(
      () => setRevision((current) => current + 1),
      (cause: Error) => setError(cause.message),
    );
  }, [store, correcting]);

  if (error) {
    return <Status.Empty icon='ph--warning--regular'>{error}</Status.Empty>;
  }
  if (!analytics) {
    return <Status.Empty>{`Writing ${DEMO.prior.length.toLocaleString()} facts…`}</Status.Empty>;
  }

  return (
    <FactBelief.Root
      analytics={analytics}
      belief={{ subject: DEMO.subject, predicate: DEMO.predicate, question: DEMO.question }}
      revision={revision}
      {...(applied || revision > 0
        ? {}
        : {
            correction: {
              label: mode === 'retract' ? 'Retract msg-0092' : 'Correct from msg-0135',
              apply,
            },
          })}
    />
  );
};

const meta = {
  title: 'ui/react-ui-rdf/FactBelief',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Correction: Story = {
  args: { mode: 'supersede' },
};

/** The end state, for a still: the correction already written. */
export const Corrected: Story = {
  args: { mode: 'supersede', applied: true },
};

/** Withdrawn rather than replaced: the store holds no standing answer, and says so. */
export const Retraction: Story = {
  args: { mode: 'retract' },
};
