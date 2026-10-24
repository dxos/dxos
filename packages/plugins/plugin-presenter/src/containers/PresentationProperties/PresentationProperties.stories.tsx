//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Presentation } from '#types';

import { PresentationProperties } from './PresentationProperties.tsx';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  return presentation ? <PresentationProperties presentation={presentation} /> : <Loading />;
};

const meta = {
  title: 'plugins/plugin-presenter/containers/PresentationProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Presentation.Presentation, Presentation.Slide, Text.Text],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Presentation.make({ name: 'Demo', slides: ['# One'] }));
        await space.db.flush({ indexes: true });
      },
    }),
  ],
  parameters: {
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The deck's theme and fonts are top-level selectors. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of ['Theme', 'Font', 'Code font']) {
      await expect(await canvas.findByText(label, undefined, { timeout: 10_000 })).toBeVisible();
    }
  },
};
