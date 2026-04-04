//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef } from 'react';

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
      <Panel.Root classNames='dx-current dx-hover w-[50rem]'>
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

  const handleHome = useCallback(() => {
    controller.current?.scrollTo(items[0]?.id);
  }, [items]);

  return (
    <Mosaic.Root classNames='dx-container'>
      <Matrix.Root Tile={StoryTile} items={items} ref={controller}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton icon='ph--house--regular' iconOnly label='Home' onClick={handleHome} />
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
