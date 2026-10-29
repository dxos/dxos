//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { type ResultsView, applyView, deriveFacets, rateAll } from '#model';
import { translations } from '#translations';

import { filterModel, filterResults, filterView } from '../../testing/filters-fixture.ts';
import { ActiveFilters } from './ActiveFilters.tsx';
import { FiltersPanel } from './FiltersPanel.tsx';
import { filtersTranslations } from './translations.ts';

/** Holds the view as the article does: the panel and the chips over the same results, re-cut on every change. */
const DefaultStory = ({ initial, hasAreas = false }: { initial?: ResultsView; hasAreas?: boolean }) => {
  const [view, setView] = useState<ResultsView>(initial ?? {});
  const [open, setOpen] = useState(true);
  const facets = useMemo(() => deriveFacets(filterResults, filterModel), []);
  const ctx = useMemo(() => ({ ratings: rateAll(filterModel, filterResults) }), []);
  const applied = useMemo(() => applyView(filterResults, view, ctx), [view, ctx]);
  return (
    <div className='flex flex-col gap-2'>
      {open && (
        <FiltersPanel
          facets={facets}
          items={filterResults}
          view={view}
          ctx={ctx}
          shown={applied.results.length}
          hasAreas={hasAreas}
          onChange={setView}
          onClose={() => setOpen(false)}
        />
      )}
      <ActiveFilters
        view={view}
        unknown={applied.unknown}
        shown={applied.results.length}
        total={filterResults.length}
        onChange={setView}
        onOpen={() => setOpen(true)}
      />
      <ol className='text-sm list-decimal ps-6' data-testid='story.results'>
        {applied.results.slice(0, 12).map((result) => (
          <li key={result.id}>
            {String(result.props['schema:name']?.[0] ?? result.id)} · {String(result.props['lh:areaM2']?.[0] ?? '?')} m²
          </li>
        ))}
      </ol>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/FiltersPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[56rem]' })],
  parameters: {
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: filtersTranslations } }],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No filters yet: 40 of 40, the sort on Score, the primary facets and "More filters". */
export const Empty: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('lighthouse.filters.count')).toHaveTextContent('40 of 40');
    await userEvent.click(canvas.getByTestId('lighthouse.filters.more'));
    await expect(await canvas.findByTestId('lighthouse.filter.is:lh:amenity=balcony')).toBeInTheDocument();
  },
};

/** WEB QA-9's view: total <= 6000, 2+ rooms, a balcony, largest flat first; the chips under the panel. */
export const Active: Story = {
  args: { initial: filterView },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('lighthouse.filters.chips')).toBeInTheDocument();
    await expect(canvas.getAllByTestId('lighthouse.filters.chip')).toHaveLength(3);
    await expect(canvas.getByTestId('lighthouse.filters.chip.sort')).toBeInTheDocument();
  },
};

/** With drawn areas the sort offers "Closest to your areas". */
export const WithAreas: Story = { args: { hasAreas: true } };
