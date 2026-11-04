//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { type Rateable, type RatingModel, type RatingOverrides } from '../../model/rating.ts';
import { entities, ratingModel } from '../../testing/fixtures.ts';
import { aroundMokotow, geoAreas, geoEntities, geoModel } from '../../testing/geo-areas-fixture.ts';
import { sessionModel, sessionOverrides } from '../../testing/model-fixture.ts';
import { ModelPanel } from './ModelPanel.tsx';
import { modelTranslations } from './translations.ts';

/** Holds the overrides, as the article does, so nudges and switches re-render the panel. */
const DefaultStory = ({
  model,
  items,
  initial,
}: {
  model: RatingModel;
  items: readonly Rateable[];
  initial?: RatingOverrides;
}) => {
  const [overrides, setOverrides] = useState<RatingOverrides | undefined>(initial);
  return (
    <ModelPanel
      model={model}
      overrides={overrides}
      items={items}
      onChange={setOverrides}
      onMap={() => {}}
      onClose={() => {}}
    />
  );
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/ModelPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[48rem]' })],
  parameters: {
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: modelTranslations } }],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The model a real session's agent wrote, with one weight nudged and one term turned off. */
export const Session: Story = { args: { model: sessionModel, items: entities, initial: sessionOverrides } };

/** A model with requirements and a penalty term, untouched. */
export const WithRequirements: Story = {
  args: {
    model: {
      ...ratingModel,
      terms: [
        ...ratingModel.terms,
        {
          id: 'far',
          label: 'Far from the centre',
          weight: -0.5,
          value: { match: 'schema:addressLocality', pattern: 'Phra Khanong' },
          shape: 'flag',
        },
      ],
      require: [{ label: 'Rated 4+', value: { prop: 'lh:ratingValue' }, op: '>=', target: 4 }],
      penalty: 0.3,
    },
    items: entities,
  },
};

/** Two preferred areas drawn on the Warsaw apartments map: one "yours" term with the area formula. */
export const PreferredAreas: Story = {
  args: { model: geoModel, items: geoEntities, initial: { areas: geoAreas } },
};

/** A required area: a requirement row with "Prefer instead". */
export const RequiredArea: Story = {
  args: { model: geoModel, items: geoEntities, initial: { areas: [{ ...aroundMokotow, mode: 'require' }] } },
};
