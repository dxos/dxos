//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type Entity } from '../../client/types.ts';
import { type RatingOverrides, applyOverrides, rateAll } from '../../model/rating.ts';
import { toCard } from '../../model/results.ts';
import { geoModel, geoOverrides, geoResults } from '../../testing/geo-fixture.ts';
import { ResultsMap } from './ResultsMap.tsx';

/** Holds the overrides and re-ranks on every edit, as the article does. */
const DefaultStory = ({ initial }: { initial?: RatingOverrides }) => {
  const [overrides, setOverrides] = useState<RatingOverrides | undefined>(initial);
  const [selected, setSelected] = useState<string>();
  const ratings = useMemo(() => rateAll(applyOverrides(geoModel, overrides), geoResults), [overrides]);
  const describe = useCallback((item: Entity) => {
    const card = toCard(item);
    return { title: card.title, detail: [card.price, item.props['lh:neighbourhood']?.[0]].filter(Boolean).join(' · ') };
  }, []);
  return (
    <ResultsMap
      items={geoResults}
      ratings={ratings}
      overrides={overrides}
      describe={describe}
      selected={selected}
      onOverrides={setOverrides}
      onSelect={setSelected}
    />
  );
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResultsMap',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[56rem]' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The Warsaw apartments session with the two areas drawn in the web UI: a required circle and a preferred lasso. */
export const WithAreas: Story = { args: { initial: geoOverrides } };

/** The same results before any area is drawn: pins coloured by the agent's model, metro stations as grey landmarks. */
export const NoAreas: Story = { args: { initial: { terms: geoOverrides.terms } } };
