//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { type Arrangement, DEFAULT_FORCE, type ForceOptions } from '@dxos/react-ui-canvas/scene';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { type Point } from '@dxos/scene';

import { translations } from '#translations';

import { type FeatureModel } from '../FeatureCard/index.ts';
import { LAYERED_FEATURES, SAMPLE_FEATURES } from '../FeatureCard/testing.ts';
import { FeatureCanvas } from './FeatureCanvas.tsx';

type StoryArgs = {
  arrange?: Arrangement;
  features?: FeatureModel[];
  force?: ForceOptions;
  lattice?: boolean;
  snap?: boolean;
  /** Changing it drops the dragged positions, so the layout runs again from the arrangement alone. */
  layoutKey?: number;
  onSelect?: (id: string | undefined) => void;
  onZoom?: (id: string) => void;
};

const DefaultStory = ({
  arrange,
  features = SAMPLE_FEATURES,
  force,
  lattice,
  layoutKey,
  onSelect,
  onZoom,
}: StoryArgs) => {
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [selectedId, setSelectedId] = useState<string>();
  useEffect(() => setPositions({}), [layoutKey]);
  return (
    <div className='dx-fill relative'>
      <FeatureCanvas
        features={features}
        positions={positions}
        onPositionsChange={setPositions}
        arrange={arrange}
        force={force}
        lattice={lattice}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          onSelect?.(id);
        }}
        onZoom={onZoom}
      />
    </div>
  );
};

/** The force layout with its strengths on sliders; Snap puts it on the lattice, and off it lays out freely. */
const ForceStory = ({ features = LAYERED_FEATURES, snap: initialSnap = false }: StoryArgs) => {
  const [attraction, setAttraction] = useState(DEFAULT_FORCE.attraction);
  const [repulsion, setRepulsion] = useState(DEFAULT_FORCE.repulsion);
  const [range, setRange] = useState(DEFAULT_FORCE.range);
  const [snap, setSnap] = useState(initialSnap);
  const [layoutKey, setLayoutKey] = useState(0);
  return (
    <div className='dx-fill relative'>
      <DefaultStory
        arrange={snap ? 'force' : 'force-free'}
        features={features}
        force={{ attraction, repulsion, range }}
        lattice={snap}
        layoutKey={layoutKey}
      />
      <div className='absolute top-2 right-2 w-64 p-trim-md flex flex-col gap-3 rounded-md bg-base-surface border border-separator'>
        <Input.Slider
          label={`Attraction ${attraction.toFixed(2)}`}
          value={[attraction]}
          min={0}
          max={2}
          step={0.05}
          onValueChange={([value]) => setAttraction(value)}
        />
        <Input.Slider
          label={`Repulsion ${repulsion.toFixed(2)}`}
          value={[repulsion]}
          min={0}
          max={2}
          step={0.05}
          onValueChange={([value]) => setRepulsion(value)}
        />
        <Input.Slider
          label={`Repulsion range ${range.toFixed(1)} cells`}
          value={[range]}
          min={0.5}
          max={10}
          step={0.5}
          onValueChange={([value]) => setRange(value)}
        />
        <div className='flex gap-2'>
          <Button.Toggle pressed={snap} onPressedChange={setSnap} icon='ph--magnet--regular' label='Snap' />
          <Button.Root
            icon='ph--arrows-clockwise--regular'
            label='Re-layout'
            onClick={() => setLayoutKey((key) => key + 1)}
          />
        </div>
      </div>
    </div>
  );
};

/** A double-click at the element's centre: the canvas hit-tests the pointer's position, which `userEvent` leaves at 0,0. */
const doubleClick = (element: HTMLElement) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, clientX: x + width / 2, clientY: y + height / 2 };
  element.dispatchEvent(new MouseEvent('dblclick', { ...init, detail: 2 }));
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-projects/components/FeatureCanvas',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
};

export default meta;

/**
 * Cards on the lattice, ranked from dependents down to foundations, with a smart arrow per dependency. A click selects
 * a card (the app shows it in the companion) and a double-click zooms into its subfeatures.
 */
export const Default: StoryObj<typeof meta> = {
  args: { onSelect: fn(), onZoom: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-canvas-node')).toHaveLength(SAMPLE_FEATURES.length), {
      timeout: 10_000,
    });
    const sync = canvas.getByText('Provider sync');
    await userEvent.click(sync);
    await waitFor(() => expect(args.onSelect).toHaveBeenCalledWith('sync'));
    doubleClick(sync);
    await waitFor(() => expect(args.onZoom).toHaveBeenCalledWith('sync'));
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

/** A force layout run to rest and laid out freely; Snap puts it on the lattice's nearest free cells. */
export const Force: StoryObj<typeof meta> = {
  render: ForceStory,
  args: { snap: false },
};
