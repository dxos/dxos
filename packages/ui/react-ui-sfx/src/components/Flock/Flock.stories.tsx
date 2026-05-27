//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Flock, type FlockColoring, type FlockStartingPosition } from './Flock';

const StoryFlock = () => {
  const {
    num,
    numObstacles,
    startingPosition,
    coloring,
    radius,
    trail,
    maxVelocity,
    alignment,
    cohesion,
    separation,
    avoidance,
  } = useControls({
    num: { label: 'Count', value: 100, min: 10, max: 1000, step: 10 },
    numObstacles: { label: 'Obstacles', value: 0, min: 0, max: 10, step: 1 },
    startingPosition: {
      label: 'Start',
      value: 'CircleRandom' as FlockStartingPosition,
      options: ['Random', 'Circle', 'CircleRandom', 'Sine', 'Phyllotaxis'] as FlockStartingPosition[],
    },
    coloring: {
      label: 'Coloring',
      value: 'Movement' as FlockColoring,
      options: ['Movement', 'Grey', 'Rainbow'] as FlockColoring[],
    },
    radius: { label: 'Size', value: 2, min: 1, max: 20, step: 0.5 },
    trail: { label: 'Trail', value: 10, min: 0, max: 20, step: 1 },
    maxVelocity: { label: 'Velocity', value: 2, min: 1, max: 5, step: 0.1 },
    alignment: { label: 'Alignment', value: 3, min: 0, max: 10, step: 0.1 },
    cohesion: { label: 'Cohesion', value: 3, min: 0, max: 10, step: 0.1 },
    separation: { label: 'Separation', value: 3, min: 0, max: 10, step: 0.1 },
    avoidance: { label: 'Avoidance', value: 3, min: 0, max: 10, step: 0.1 },
  });

  return (
    <Flock
      num={num}
      numObstacles={numObstacles}
      startingPosition={startingPosition}
      coloring={coloring}
      radius={radius}
      trail={trail}
      maxVelocity={maxVelocity}
      alignment={alignment}
      cohesion={cohesion}
      separation={separation}
      avoidance={avoidance}
    />
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Flock',
  component: StoryFlock,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof StoryFlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
