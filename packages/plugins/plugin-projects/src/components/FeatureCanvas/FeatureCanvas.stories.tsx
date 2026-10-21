//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { type Arrangement, type Point } from '@dxos/react-ui-canvas/scene';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { type FeatureModel } from '../FeatureCard/index.ts';
import { LAYERED_FEATURES, SAMPLE_FEATURES } from '../FeatureCard/testing.ts';
import { FeatureCanvas } from './FeatureCanvas.tsx';

type StoryArgs = { arrange?: Arrangement; features?: FeatureModel[] };

const DefaultStory = ({ arrange, features: initial = SAMPLE_FEATURES }: StoryArgs) => {
  const [features, setFeatures] = useState(initial);
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const update = (id: string, values: { name?: string; description?: string }) =>
    setFeatures((current) => current.map((feature) => (feature.id === id ? { ...feature, ...values } : feature)));
  return (
    <div className='dx-fill relative'>
      <FeatureCanvas
        features={features}
        positions={positions}
        onPositionsChange={setPositions}
        arrange={arrange}
        onRename={(id, name) => update(id, { name })}
        onDescribe={(id, description) => update(id, { description })}
      />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
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

/** Each rank in id order: arrows cross wherever the ids happen to sort against the dependencies. */
export const RankOrder: StoryObj<typeof meta> = {
  args: { arrange: 'rank', features: LAYERED_FEATURES },
};

/** Each rank ordered by its neighbours' mean column over several sweeps, keeping the order with fewest crossings. */
export const FewestCrossings: StoryObj<typeof meta> = {
  args: { arrange: 'crossings', features: LAYERED_FEATURES },
};

/**
 * Fewest crossings, then improved card by card: each moves to a nearby free cell or swaps with a nearby card when that
 * lowers the cost of the links as the canvas routes them (crossings, then bends, then length).
 */
export const Routed: StoryObj<typeof meta> = {
  args: { arrange: 'routed', features: LAYERED_FEATURES },
};

/** A force layout seeded from the ranks, run to rest, then snapped to the nearest free lattice cell. */
export const ForceSnapped: StoryObj<typeof meta> = {
  args: { arrange: 'force', features: LAYERED_FEATURES },
};

/** The same force layout where it came to rest, before snapping, to see what the snap changes. */
export const ForceUnsnapped: StoryObj<typeof meta> = {
  args: { arrange: 'force-free', features: LAYERED_FEATURES },
};
