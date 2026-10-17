//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentType, useEffect } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FormatId, FORMATS, SPOT_SECONDS, TIMING } from './brand.ts';
import { ComposerIntro } from './ComposerIntro.tsx';
import { loadBrandFont } from './fonts.ts';
import { IdentPlayer } from './IdentPlayer.tsx';
import { PROVOCATIONS } from './provocations.ts';
import { EndOnly, OpenOnly, Spot10, Spot30 } from './Spots.tsx';
import { type IdentProps, TAILWIND_COLOR_NAMES } from './theme.tsx';

/** The theme's main colour (none), then every Tailwind colour. */
const LOGO_COLORS = ['', ...TAILWIND_COLOR_NAMES];

type CardId = 'opening' | 'composer' | 'outro' | 'provocation';

type StoryProps = IdentProps & {
  card: CardId;
  /** The ident format: the frame the card is rendered at, letterboxed to the viewport. */
  size?: FormatId;
  /** Provocation only: which interstitial, and the 10s or 30s cut. */
  provocationId?: string;
  length?: '10s' | '30s';
};

type Card = { component: ComponentType<IdentProps & { provocationId: string }>; seconds: number };

/** The bookend cards; a provocation picks its spot by length. */
const CARDS: Record<Exclude<CardId, 'provocation'>, Card> = {
  opening: { component: OpenOnly, seconds: TIMING.open.duration },
  composer: { component: ComposerIntro, seconds: TIMING.composer.duration },
  outro: { component: EndOnly, seconds: TIMING.spot10.endCard },
};

/** Loops one card at the chosen size, theme and logo colour. */
const IdentStory = ({ card, size = '16x10', theme, logoColor, provocationId = 'P01', length = '10s' }: StoryProps) => {
  useEffect(() => loadBrandFont(), []);
  const { component, seconds }: Card =
    card === 'provocation'
      ? { component: length === '30s' ? Spot30 : Spot10, seconds: SPOT_SECONDS[length] }
      : CARDS[card];
  return (
    <IdentPlayer
      // A new card or size is a new composition, so the player starts over.
      key={`${card}-${size}-${provocationId}-${length}`}
      component={component}
      inputProps={{ provocationId }}
      seconds={seconds}
      width={FORMATS[size].width}
      height={FORMATS[size].height}
      theme={theme}
      logoColor={logoColor || undefined}
    />
  );
};

/**
 * The DXOS ident cards that bookend an autocue take (`trim-static.mjs --ident`), and the provocation interstitials.
 *
 * Test:
 * 1. Each card loops at the chosen size (16x10, 16x9, 9x16, 1x1, 4x5), letterboxed in the theme's ground.
 * 2. Theme light draws off-black on off-white; the Composer rings keep their brand colours.
 * 3. Logo colour recolours the DXOS mark (and the Composer wordmark); on the outro the rule takes the same colour.
 * 4. Provocation steps through P01-P14 in the 10s or 30s cut.
 */
const meta: Meta<typeof IdentStory> = {
  title: 'tools/autocue/Ident',
  render: (args) => <IdentStory {...args} />,
  argTypes: {
    size: { control: 'select', options: Object.keys(FORMATS) },
    theme: { control: 'inline-radio', options: ['dark', 'light'] },
    logoColor: { control: 'select', options: LOGO_COLORS },
    card: { table: { disable: true } },
    provocationId: { table: { disable: true } },
    length: { table: { disable: true } },
  },
  args: { size: '16x10', theme: 'dark', logoColor: '' },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof IdentStory>;

export const Opening: Story = {
  args: { card: 'opening' },
};

export const Composer: Story = {
  args: { card: 'composer' },
};

export const Outro: Story = {
  args: { card: 'outro' },
};

export const Provocation: Story = {
  args: { card: 'provocation', provocationId: 'P01', length: '10s' },
  argTypes: {
    provocationId: { control: 'select', options: PROVOCATIONS.map(({ id }) => id), table: { disable: false } },
    length: { control: 'inline-radio', options: ['10s', '30s'], table: { disable: false } },
  },
};
