//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { type Point } from '@dxos/react-ui-canvas/scene';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { SAMPLE_FEATURES } from '../FeatureCard/testing.ts';
import { FeatureCanvas } from './FeatureCanvas.tsx';

const DefaultStory = () => {
  const [positions, setPositions] = useState<Record<string, Point>>({});
  return (
    <div className='dx-fill relative'>
      <FeatureCanvas features={SAMPLE_FEATURES} positions={positions} onPositionsChange={setPositions} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-projects/components/FeatureCanvas',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
};

export default meta;

/** Cards in boxes, ranked from dependents down to foundations, with a straight arrow per dependency. Drag a box. */
export const Default: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(SAMPLE_FEATURES.length), {
      timeout: 10_000,
    });
  },
};
