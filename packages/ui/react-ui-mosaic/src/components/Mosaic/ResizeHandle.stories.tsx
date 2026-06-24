//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { ScrollArea, type Axis } from '@dxos/react-ui';
import { type Size } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Mosaic, type MosaicTileProps } from './Mosaic';

type Item = { id: string; label: string };

const ITEMS: Item[] = Array.from({ length: 6 }, (_, index) => ({ id: `tile-${index}`, label: `Tile ${index + 1}` }));

const DEFAULT_HORIZONTAL: Size = 24;
const DEFAULT_VERTICAL: Size = 8;

// Per-axis resize bounds (rem) declared on the tile.
const BOUNDS = {
  horizontal: {
    minSize: 12,
    maxSize: 40,
  },
  vertical: {
    minSize: 4,
    maxSize: 16,
  },
} as const;

type ResizableTileProps = MosaicTileProps<Item> & {
  onResize: (id: string, size: Size) => void;
};

const ResizableTile = ({ data, size, onResize, ...tileProps }: ResizableTileProps) => {
  const handleSizeChange = useCallback((next: Size) => onResize(data.id, next), [data.id, onResize]);

  return (
    <Mosaic.Tile
      {...tileProps}
      classNames='flex flex-col p-2 m-1 border border-separator rounded-sm bg-base-surface overflow-hidden'
      data={data}
      size={size}
      onSizeChange={handleSizeChange}
    >
      <div className='font-medium'>{data.label}</div>
      <div className='text-xs text-description'>{typeof size === 'number' ? `${size}rem` : 'intrinsic'}</div>
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

const DefaultStory = ({ orientation = 'vertical' }: { orientation?: Axis }) => {
  const initial = orientation === 'horizontal' ? DEFAULT_HORIZONTAL : DEFAULT_VERTICAL;
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>(() =>
    Object.fromEntries(ITEMS.map((item) => [item.id, initial])),
  );

  const handleSizeChange = useCallback((id: string, size: Size) => setSizes((prev) => ({ ...prev, [id]: size })), []);

  const bounds = BOUNDS[orientation];
  const Tile = useMemo(
    () => (tileProps: MosaicTileProps<Item>) => (
      <ResizableTile {...tileProps} {...bounds} size={sizes[tileProps.data.id]} onResize={handleSizeChange} />
    ),
    [sizes, handleSizeChange, bounds],
  );

  return (
    <Mosaic.Root>
      <Mosaic.Container
        asChild
        orientation={orientation}
        autoScroll={viewport}
        eventHandler={{ id: 'resize-demo', canDrop: () => false }}
      >
        <ScrollArea.Root orientation={orientation}>
          <ScrollArea.Viewport ref={setViewport}>
            <Mosaic.Stack
              orientation={orientation}
              getId={(item) => item.id}
              items={ITEMS}
              draggable={false}
              Tile={Tile}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </Mosaic.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-mosaic/ResizeHandle',
  decorators: [withLayout({ layout: 'fullscreen' }), withTheme()],
  render: (args) => <DefaultStory {...args} />,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};
