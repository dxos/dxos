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
  const [features, setFeatures] = useState(SAMPLE_FEATURES);
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const update = (id: string, values: { name?: string; description?: string }) =>
    setFeatures((current) => current.map((feature) => (feature.id === id ? { ...feature, ...values } : feature)));
  return (
    <div className='dx-fill relative'>
      <FeatureCanvas
        features={features}
        positions={positions}
        onPositionsChange={setPositions}
        onRename={(id, name) => update(id, { name })}
        onDescribe={(id, description) => update(id, { description })}
      />
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

/** Cards on the lattice, ranked from dependents down to foundations, with a smart arrow per dependency. Drag a box; a pencil edits a title. */
export const Default: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(SAMPLE_FEATURES.length), {
      timeout: 10_000,
    });
  },
};
