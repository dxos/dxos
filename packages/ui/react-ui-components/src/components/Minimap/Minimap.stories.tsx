//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Minimap, type MinimapMarker, type MinimapProps } from './Minimap';

const DOC_LENGTH = 2000;
const WINDOW = 320;

// Synthetic prompt/response markers spread across a document of length `DOC_LENGTH`.
const createMarkers = (count: number): MinimapMarker[] =>
  Array.from({ length: count }, (_, index) => {
    const from = Math.round((index / count) * DOC_LENGTH);
    const to = Math.round(((index + 1) / count) * DOC_LENGTH) - 8;
    return {
      id: `marker-${index}`,
      title: `Prompt ${index + 1}`,
      description: `Response snippet for prompt ${index + 1}. This is the first few lines of the assistant reply, shown in the popover on hover.`,
      range: { from, to },
    };
  });

const defaultMarkers = createMarkers(14);

const DefaultStory = ({ markers, ...props }: MinimapProps) => {
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState<MinimapMarker | null>(null);
  const visibleRange = useMemo(() => ({ from: start, to: start + WINDOW }), [start]);

  return (
    <div className='relative grid grid-cols-[3rem_1fr] gap-6'>
      <div>
        <div className='absolute left-0 top-0'>
          <Minimap
            {...props}
            markers={markers}
            visibleRange={visibleRange}
            onSelect={(marker) => setSelected(marker)}
          />
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='text-description'>
            Visible range: {visibleRange.from}–{visibleRange.to} (drag to scroll)
          </span>
          <input
            type='range'
            min={0}
            max={DOC_LENGTH - WINDOW}
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
          />
        </label>
        <p className='text-sm text-description'>
          Hover the rail to see the wave + popover. Ticks intersecting the visible range are brighter.
        </p>
        <p className='text-sm'>Selected: {selected ? selected.title : '(none)'}</p>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/Minimap',
  component: Minimap,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof Minimap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { markers: defaultMarkers },
};

export const Empty: Story = {
  args: { markers: [] },
};
