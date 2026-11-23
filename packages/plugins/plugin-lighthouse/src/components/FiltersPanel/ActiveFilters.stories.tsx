//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { type ResultsView, applyView } from '#model';
import { translations } from '#translations';

import { filterResults, filterView } from '../../testing/filters-fixture.ts';
import { ActiveFilters } from './ActiveFilters.tsx';
import { filtersTranslations } from './translations.ts';

const DefaultStory = ({ initial }: { initial: ResultsView }) => {
  const [view, setView] = useState(initial);
  const applied = useMemo(() => applyView(filterResults, view, {}), [view]);
  return (
    <ActiveFilters
      view={view}
      unknown={applied.unknown}
      shown={applied.results.length}
      total={filterResults.length}
      onChange={setView}
      onOpen={() => {}}
    />
  );
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/ActiveFilters',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[48rem]' })],
  parameters: {
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: filtersTranslations } }],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Kept unknowns: "incl. N unknown" on each chip, the sort chip, "Clear all". */
export const IncludingUnknown: Story = { args: { initial: filterView } };

/** The balcony filter with unknowns left out: "known only". */
export const KnownOnly: Story = {
  args: {
    initial: {
      ...filterView,
      filters: (filterView.filters ?? []).map((filter) =>
        filter.id === 'is:lh:amenity=balcony' ? { ...filter, includeMissing: false } : filter,
      ),
    },
  },
};
