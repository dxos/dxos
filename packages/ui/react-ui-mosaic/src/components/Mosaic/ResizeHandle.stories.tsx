//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { type Axis } from '@dxos/react-ui';
import { type Size } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Mosaic, type MosaicTileProps } from './Mosaic';

type Item = { id: string; label: string };

const ITEMS: Item[] = Array.from({ length: 6 }, (_, i) => ({ id: `tile-${i}`, label: `Tile ${i + 1}` }));

const DEFAULT_HORIZONTAL: Size = 24;
const DEFAULT_VERTICAL: Size = 8;

type ResizableTileProps = MosaicTileProps<Item> & {
  onResize: (id: string, size: Size) => void;
};

const ResizableTile = ({ data, size, onResize, ...tileProps }: ResizableTileProps) => {
  const handleSizeChange = useCallback((next: Size) => onResize(data.id, next), [data.id, onResize]);
  return (
    <Mosaic.Tile
      {...tileProps}
      data={data}
      size={size}
      onSizeChange={handleSizeChange}
      classNames='flex flex-col p-2 m-1 border border-separator rounded-sm bg-base-surface overflow-hidden'
    >
      <div className='font-medium'>{data.label}</div>
      <div className='text-xs text-description'>{typeof size === 'number' ? `${size}rem` : 'intrinsic'}</div>
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

const ResizableStackStory = ({ orientation }: { orientation: Axis }) => {
  const initial = orientation === 'horizontal' ? DEFAULT_HORIZONTAL : DEFAULT_VERTICAL;
  const [sizes, setSizes] = useState<Record<string, Size>>(() =>
    Object.fromEntries(ITEMS.map((item) => [item.id, initial])),
  );
  const handleSizeChange = useCallback((id: string, size: Size) => setSizes((prev) => ({ ...prev, [id]: size })), []);
  const Tile = useMemo(
    () => (tileProps: MosaicTileProps<Item>) => (
      <ResizableTile {...tileProps} size={sizes[tileProps.data.id]} onResize={handleSizeChange} />
    ),
    [sizes, handleSizeChange],
  );

  return (
    <Mosaic.Root>
      <Mosaic.Container orientation={orientation} eventHandler={{ id: 'resize-demo', canDrop: () => false }}>
        <div className={mx('flex overflow-auto', orientation === 'horizontal' ? 'h-full' : 'flex-col w-full')}>
          <Mosaic.Stack orientation={orientation} items={ITEMS} getId={(item) => item.id} draggable={false} Tile={Tile} />
        </div>
      </Mosaic.Container>
    </Mosaic.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-mosaic/ResizeHandle',
  decorators: [withLayout({ layout: 'fullscreen' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

export const Horizontal: Story = {
  render: () => <ResizableStackStory orientation='horizontal' />,
};

export const Vertical: Story = {
  render: () => <ResizableStackStory orientation='vertical' />,
};
