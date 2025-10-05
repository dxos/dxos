//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import CONTENT from '../../../testing/deck.md?raw';
import { translations } from '../../translations';

import { RevealPlayer } from './RevealPlayer';

// https://revealjs.com/markdown
// https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
// https://colorhunt.co/palettes/dark
// https://colorhunt.co/palette/ff204ea0153e5d0e4100224d
// https://colorhunt.co/palette/27374d526d829db2bfdde6ed
// https://fontsource.org/fonts
// https://fonts.google.com

const meta = {
  title: 'plugins/plugin-presenter/RevealPlayer',
  component: RevealPlayer,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RevealPlayer>;

export default meta;

type Story = Meta<typeof RevealPlayer>;

export const Default: Story = {
  args: {
    fullscreen: true,
    content: CONTENT,
  },
};
