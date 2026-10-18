//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Dnd } from '@dxos/react-ui-dnd';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type MosaicScrollController } from './Container.tsx';
import { Mosaic } from './Mosaic.ts';
import { type MosaicTileProps } from './Tile.tsx';

//
// Tiles whose heights differ from the estimate in both directions, so a tile left at its estimate
// shows as an overlap (tall tile) or a gap (short tile) against its neighbour.
//

const NUM_ITEMS = 100;
const ESTIMATE = 150;
const GAP = 8;
const TALL = 280;
const SHORT = 48;

type MeasureItem = { id: string; index: number; height: number };

const MeasureTile: FC<MosaicTileProps<MeasureItem>> = ({ data, location, current }) => (
  <Mosaic.Tile id={data.id} data={data} location={location} current={current} asChild>
    <div
      data-testid='measure-tile'
      className='border border-separator rounded-sm px-2'
      style={{ height: data.height, boxSizing: 'border-box' }}
    >
      Item #{data.index} ({data.height}px)
    </div>
  </Mosaic.Tile>
);

const TARGET_ID = '6';

const VirtualStackMeasureStory = () => {
  const items = useMemo<MeasureItem[]>(
    () =>
      Array.from({ length: NUM_ITEMS }, (_, index) => ({
        id: String(index),
        index,
        height: index % 2 === 0 ? TALL : SHORT,
      })),
    [],
  );
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const controllerRef = useRef<MosaicScrollController>(null);

  return (
    <Dnd.Root>
      <Panel.Root>
        <Panel.Header>
          <Toolbar.Root>
            <Button.Root data-testid='scroll-to-target' onClick={() => controllerRef.current?.scrollToItem(TARGET_ID)}>
              Scroll to #{TARGET_ID}
            </Button.Root>
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <Mosaic.Container
            asChild
            controllerRef={controllerRef}
            eventHandler={{ id: 'virtual-stack-measure', canDrop: () => false }}
          >
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport ref={setViewport} data-testid='measure-viewport'>
                <Mosaic.VirtualStack
                  Tile={MeasureTile}
                  items={items}
                  draggable={false}
                  getId={(item) => item.id}
                  getScrollElement={() => viewport}
                  estimateSize={() => ESTIMATE}
                  gap={GAP}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Panel.Body>
      </Panel.Root>
    </Dnd.Root>
  );
};

/** Pixel gaps between each mounted row and the next, in index order. */
const getRowGaps = (root: HTMLElement) => {
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-index]')).sort(
    (a, b) => Number(a.dataset.index) - Number(b.dataset.index),
  );
  return rows.slice(1).map((row, i) => {
    const prev = rows[i].getBoundingClientRect();
    return {
      index: Number(row.dataset.index),
      gap: Math.round(row.getBoundingClientRect().top - prev.bottom),
    };
  });
};

const meta: Meta = {
  title: 'ui/react-ui-mosaic/VirtualStackMeasure',
  render: VirtualStackMeasureStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A smooth scroll to a nearby item mounts tiles below the viewport while it runs; each must still be
 * measured, so every mounted row sits exactly one `gap` after the previous one.
 */
export const SmoothScrollMeasuresTiles: Story = {
  play: async () => {
    const body = within(document.body);
    const viewport = await body.findByTestId('measure-viewport', undefined, { timeout: 30_000 });
    await waitFor(() => expect(within(viewport).getAllByTestId('measure-tile').length).toBeGreaterThan(0));

    await userEvent.click(await body.findByTestId('scroll-to-target'));

    // Wait for the smooth scroll to land and the virtualizer's scrolling flag to reset.
    await waitFor(() => expect(within(viewport).getByText(`Item #${TARGET_ID} (${TALL}px)`)).toBeVisible());
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    await waitFor(() => expect(getRowGaps(viewport).filter(({ gap }) => Math.abs(gap - GAP) > 1)).toEqual([]), {
      timeout: 5_000,
    });
  },
};
