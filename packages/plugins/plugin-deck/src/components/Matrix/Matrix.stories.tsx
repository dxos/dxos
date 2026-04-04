//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Focus, Panel, Toolbar } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { Matrix, type MatrixController, type MatrixRootProps } from './Matrix';

const StoryTile = (props: MosaicTileProps<Obj.Any>) => (
  <Mosaic.Tile {...props} asChild>
    <Focus.Item asChild border>
      <Panel.Root classNames='dx-current dx-hover w-[50rem] snap-start'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>{props.id}</Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Json data={props.data} />
        </Panel.Content>
      </Panel.Root>
    </Focus.Item>
  </Mosaic.Tile>
);

const DefaultStory = () => {
  const items = useMemo(
    () => [
      // Hierarchy.
      Organization.make({ name: 'DXOS' }),
      Person.make({ fullName: 'Test Bot' }),
      Text.make('Test Bot Bio'),
    ],
    [],
  );

  const controller = useRef<MatrixController>(null);

  // TODO(burdon): Set focus.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    controller.current?.scrollTo(items[index]?.id);
  }, [items, index]);

  return (
    <Mosaic.Root classNames='dx-container'>
      <Matrix.Root Tile={StoryTile} items={items} ref={controller}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--caret-left--regular'
                iconOnly
                label='Back'
                onClick={() => setIndex((index) => (index > 0 ? index - 1 : index))}
              />
              <Toolbar.IconButton
                icon='ph--caret-right--regular'
                iconOnly
                label='Forward'
                onClick={() => setIndex((index) => (index < items.length - 1 ? index + 1 : index))}
              />
              <Toolbar.Text>
                {index + 1} / {items.length}
              </Toolbar.Text>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Matrix.Content>
              <Matrix.Viewport />
            </Matrix.Content>
          </Panel.Content>
        </Panel.Root>
      </Matrix.Root>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'plugins/plugin-deck/components/Matrix',
  component: Matrix.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<MatrixRootProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
