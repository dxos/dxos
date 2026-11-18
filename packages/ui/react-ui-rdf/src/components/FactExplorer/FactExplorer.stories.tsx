//
// Copyright 2026 DXOS.org
//

/**
 * The aggregate-first explorer over a fact set, seeded with the generated inbox corpus (~1,000 facts over ~400
 * messages, 45 entities, 16 wordings collapsing onto fewer predicates). Nothing here loads the whole set to draw
 * the overview: every panel is a count the backend computes, and the fact list below is capped at 200 with the
 * true total stated beside it.
 *
 * - `Default` runs over the fact array (`FactAnalyticsLive.fromFacts`): instant, no SQLite, same arithmetic.
 * - `Store` writes the corpus into a real in-memory `FactStore` and aggregates in SQL — the app's path.
 * - `Scoped` starts narrowed to one entity, which is where the drill-down lands.
 * - `Empty` shows the empty state with a store that has no facts.
 *
 * Test:
 * 1. Click a row in `Predicates` — every panel, the cross-tab and the fact list narrow to it, and the count drops.
 * 2. Click a cell in `Entities × predicates` — the scope takes both axes at once.
 * 3. Click the same row again, or the toolbar's `x` — the scope clears and the full count returns.
 * 4. In `Store`, compare the counts against `Default`: the SQL and JS backends must agree.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, FactAnalyticsLive, FactStoreLive } from '@dxos/pipeline-rdf';
import { DEMO_CORPUS } from '@dxos/pipeline-rdf/testing';
import * as Status from '@dxos/react-ui/Status';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FactExplorer, type FactScope } from './FactExplorer.tsx';

const MEMORY = FactAnalyticsLive.fromFacts(DEMO_CORPUS);

type StoryProps = {
  /** Where the counts come from: the fact array, or a real store aggregating in SQL. */
  backend: 'memory' | 'store';
  /** Facts to seed a store-backed story with. */
  facts?: typeof DEMO_CORPUS;
  initialScope?: FactScope;
};

/**
 * Opens an in-memory `FactStore`, writes the corpus into it and renders the explorer over it. The store is not
 * reactive, so the write has to finish before the overview is read — hence the loading state rather than an
 * explorer that would first render against an empty store.
 */
const StoreBacked = ({ facts, initialScope }: { facts: typeof DEMO_CORPUS; initialScope?: FactScope }) => {
  const [analytics, setAnalytics] = useState<FactAnalytics | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const store = FactStoreLive.makeMemory();
    void EffectEx.runPromise(store.putFacts(facts)).then(
      () => !cancelled && setAnalytics(FactAnalyticsLive.fromStore(store)),
      (cause: Error) => !cancelled && setError(cause.message),
    );
    return () => {
      cancelled = true;
    };
  }, [facts]);

  if (error) {
    return <Status.Empty icon='ph--warning--regular'>{error}</Status.Empty>;
  }
  if (!analytics) {
    return <Status.Empty>{`Writing ${facts.length.toLocaleString()} facts…`}</Status.Empty>;
  }
  return <FactExplorer.Root analytics={analytics} initialScope={initialScope} />;
};

const DefaultStory = ({ backend, facts = DEMO_CORPUS, initialScope }: StoryProps) =>
  backend === 'store' ? (
    <StoreBacked facts={facts} initialScope={initialScope} />
  ) : (
    <FactExplorer.Root analytics={MEMORY} initialScope={initialScope} />
  );

const meta = {
  title: 'ui/react-ui-rdf/FactExplorer',
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
  args: { backend: 'memory' },
};

/** The app's path: the same corpus written into SQLite, every count a SPARQL aggregate. */
export const Store: Story = {
  args: { backend: 'store' },
};

/** Narrowed to the entity the corpus mentions most, which is where a drill-down ends up. */
export const Scoped: Story = {
  args: { backend: 'memory', initialScope: { entity: 'alice-chen' } },
};

export const Empty: Story = {
  args: { backend: 'store', facts: [] },
};
