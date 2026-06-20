//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Kube, defaultConfig } from './Kube';

const StoryKube = () => {
  const {
    radius,
    minDistance,
    particleCount,
    maxConnections,
    limitConnections,
    showLines,
    velocityX,
    velocityY,
    velocityZ,
  } = useControls({
    radius: {
      label: 'Radius',
      value: defaultConfig.radius,
      min: 200,
      max: 1600,
      step: 50,
    },
    minDistance: {
      label: 'Min distance',
      value: defaultConfig.minDistance,
      min: 20,
      max: 400,
      step: 10,
    },
    particleCount: {
      label: 'Particles',
      value: defaultConfig.particleCount,
      min: 50,
      max: 600,
      step: 10,
    },
    maxConnections: {
      label: 'Max connections',
      value: defaultConfig.maxConnections,
      min: 1,
      max: 50,
      step: 1,
    },
    limitConnections: {
      label: 'Limit connections',
      value: defaultConfig.limitConnections,
    },
    showLines: {
      label: 'Show lines',
      value: defaultConfig.showLines,
    },
    velocityX: {
      label: 'Velocity X',
      value: defaultConfig.velocityX,
      min: -1,
      max: 1,
      step: 0.05,
    },
    velocityY: {
      label: 'Velocity Y',
      value: defaultConfig.velocityY,
      min: -1,
      max: 1,
      step: 0.05,
    },
    velocityZ: {
      label: 'Velocity Z',
      value: defaultConfig.velocityZ,
      min: -1,
      max: 1,
      step: 0.05,
    },
  });

  const config = useMemo(
    () => ({
      radius,
      minDistance,
      particleCount,
      maxConnections,
      limitConnections,
      showLines,
      velocityX,
      velocityY,
      velocityZ,
    }),
    [radius, minDistance, particleCount, maxConnections, limitConnections, showLines, velocityX, velocityY, velocityZ],
  );

  return <Kube config={config} />;
};

const meta = {
  title: 'ui/react-ui-experimental/Kube',
  component: StoryKube,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof StoryKube>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
