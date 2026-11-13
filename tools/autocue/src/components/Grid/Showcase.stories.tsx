//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useThemeContext } from '@dxos/react-ui/Theme';

import { IdentPlayer } from '../Ident/IdentPlayer.tsx';
import { ComposerIntro, EndOnly, TIMING, loadBrandFont } from '../Ident/index.ts';
import { Grid } from './Grid.tsx';

type ShowcaseProps = {
  /** Hides the Grid's toolbar. */
  controls?: boolean;
  /** Renders the Grid one frame at a time through `window.grid.seek`, for `showcase/render.mjs`. */
  stepped?: boolean;
  /** Each of the three tour clips' close-up, in ms, from landing to the next landing. */
  slot?: number;
  /** Each tour close-up's own slot in turn, in ms (its clip plus one transition); it overrides `slot`. */
  slots?: number[];
  /** The closing drift of the zoomed-out wall, in ms. */
  driftMs?: number;
  /** The drift's speed, in cells per second. */
  drift?: number;
};

/** The showcase's grid part: three tour close-ups, then the zoomed-out wall drifting down. */
const ShowcaseGrid = ({
  slot = 10_000,
  slots,
  driftMs = 12_000,
  drift = 0.2,
  controls,
  stepped,
  onEnded,
}: ShowcaseProps & { onEnded?: () => void }) => (
  <Grid
    cols={6}
    rows={6}
    gap={12}
    tour={[
      [0, 3],
      [1, 3],
      [2, 3],
    ]}
    hold={slot}
    pan={1_500}
    duration={12_000}
    variant='shift'
    content='clips'
    tourSlot={slot}
    tourSlots={slots}
    montage={[]}
    zoomMs={600}
    shiftMs={600}
    drift={drift}
    driftAfter={driftMs}
    controls={controls}
    stepped={stepped}
    onEnded={onEnded}
  />
);

/**
 * The showcase cut: the Composer ident; the first tour clip close up, shifting to the second and the third; the wall
 * zooming out to drift down; then the end card, looped.
 */
const ShowcaseStory = ({ slot = 10_000, slots, driftMs = 12_000, drift = 0.2 }: ShowcaseProps) => {
  const [phase, setPhase] = useState<'ident' | 'grid' | 'outro'>('ident');
  // The cards are drawn in the page's theme, as the Frame story's are.
  const { themeMode } = useThemeContext();
  useEffect(() => loadBrandFont(), []);
  const card = { width: 1920, height: 1080, inputProps: {}, theme: themeMode };
  switch (phase) {
    case 'ident':
      return (
        <IdentPlayer
          key='ident'
          {...card}
          component={ComposerIntro}
          seconds={TIMING.composer.duration}
          onEnded={() => setPhase('grid')}
        />
      );
    case 'grid':
      return (
        <ShowcaseGrid slot={slot} slots={slots} driftMs={driftMs} drift={drift} onEnded={() => setPhase('outro')} />
      );
    case 'outro':
      return (
        <IdentPlayer
          key='outro'
          {...card}
          component={EndOnly}
          seconds={TIMING.spot10.endCard}
          onEnded={() => setPhase('ident')}
        />
      );
  }
};

const meta: Meta<ShowcaseProps> = {
  title: 'tools/autocue/Showcase',
  render: ShowcaseStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    slot: { type: { name: 'number' }, control: 'number' },
    slots: { type: { name: 'array', value: { name: 'number' } }, control: 'object' },
    driftMs: { type: { name: 'number' }, control: 'number' },
    drift: { type: { name: 'number' }, control: { type: 'number', step: 0.05 } },
  },
};

export default meta;

type Story = StoryObj<ShowcaseProps>;

export const Default: Story = {};

/** The grid part alone, so `showcase/render.mjs` can step it; the ident and end card are rendered by Remotion. */
export const GridOnly: Story = {
  render: (args) => <ShowcaseGrid {...args} />,
  argTypes: {
    controls: { type: { name: 'boolean' }, control: 'boolean' },
    stepped: { type: { name: 'boolean' }, control: 'boolean' },
  },
};
