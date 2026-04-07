//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { DeckSettings } from './DeckSettings';

const meta = {
  title: 'plugins/plugin-deck/components/DeckSettings',
  tags: ['settings'],
  component: DeckSettings,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DeckSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      enableDeck: true,
      encapsulatedPlanks: false,
      enableStatusbar: true,
      showHints: true,
      enableNativeRedirect: false,
      newPlankPositioning: 'end',
      overscroll: 'none',
    },
  },
};
