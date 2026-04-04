//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Focus, Panel, Toolbar } from '@dxos/react-ui';
import { type MosaicTileProps, Mosaic } from '@dxos/react-ui-mosaic';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { Matrix, type MatrixController, type MatrixRootProps } from './Matrix';

faker.seed(123);

const StoryTile = (props: MosaicTileProps<Obj.Any>) => (
  <Mosaic.Tile {...props} asChild>
    <Focus.Item asChild border>
      <Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <p>{Obj.getLabel(props.data)}</p>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Json.Root data={props.data}>
          <Panel.Content asChild>
            <Json.Content />
          </Panel.Content>
        </Json.Root>
      </Panel.Root>
    </Focus.Item>
  </Mosaic.Tile>
);

/**
 * Tile that approximates Plank functionality using Surface to resolve content.
 */
const PlankTile = (props: MosaicTileProps<Obj.Any>) => {
  const data = useMemo(
    () => ({
      attendableId: props.data.id,
      subject: props.data,
    }),
    [props.data],
  );

  return (
    <Mosaic.Tile {...props} asChild>
      <Focus.Item asChild border>
        <Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0'>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <p>{Obj.getLabel(props.data)}</p>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <Surface.Surface role='article' data={data} limit={1} />
          </Panel.Content>
        </Panel.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
};

const storySurfaceExtension = Capability.contributes(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'story-article',
    role: 'article',
    component: ({ data }) => {
      const subject = (data as any)?.subject;
      if (!subject) {
        return <Loading />;
      }

      return (
        <Json.Root data={subject}>
          <Json.Content />
        </Json.Root>
      );
    },
  }),
);

type DefaultStoryProps = Pick<MatrixRootProps, 'Tile'>;

const DefaultStory = ({ Tile }: DefaultStoryProps) => {
  const items = useMemo(
    () => [
      Organization.make({ name: faker.company.name() }),
      Person.make({ fullName: faker.person.fullName() }),
      Text.make({ name: 'Bio', content: faker.lorem.paragraphs(10) }),
      Text.make({ name: 'Companion', content: 'Companion panel for Bio' }),
    ],
    [],
  );

  const controller = useRef<MatrixController>(null);
  const [current, setCurrent] = useState<string | undefined>(items[0]?.id);

  const handleCurrentChange = useCallback(
    (id: string | undefined) => {
      setCurrent(id);
    },
    [],
  );

  const handlePrev = useCallback(() => {
    const index = items.findIndex((item) => item.id === current);
    const prev = items[Math.max(0, index - 1)];
    if (prev) {
      controller.current?.scrollTo(prev.id);
    }
  }, [items, current]);

  const handleNext = useCallback(() => {
    const index = items.findIndex((item) => item.id === current);
    const next = items[Math.min(items.length - 1, index + 1)];
    if (next) {
      controller.current?.scrollTo(next.id);
    }
  }, [items, current]);

  const currentIndex = items.findIndex((item) => item.id === current);

  return (
    <Mosaic.Root classNames='dx-container'>
      <Matrix.Root Tile={Tile} items={items} current={current} onCurrentChange={handleCurrentChange} ref={controller}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--caret-left--regular'
                iconOnly
                label='Back'
                onClick={handlePrev}
              />
              <Toolbar.IconButton
                icon='ph--caret-right--regular'
                iconOnly
                label='Forward'
                onClick={handleNext}
              />
              <Toolbar.Text>
                {currentIndex + 1} / {items.length}
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

const SurfaceStory = ({ Tile }: DefaultStoryProps) => {
  const items = useMemo(
    () => [
      Organization.make({ name: faker.company.name() }),
      Person.make({ fullName: faker.person.fullName() }),
      Text.make({ name: 'Bio', content: faker.lorem.paragraphs(10) }),
      Text.make({ name: 'Companion', content: 'Companion panel for Bio' }),
    ],
    [],
  );

  const controller = useRef<MatrixController>(null);
  const [current, setCurrent] = useState<string | undefined>(items[0]?.id);

  const handleCurrentChange = useCallback(
    (id: string | undefined) => {
      setCurrent(id);
    },
    [],
  );

  const handlePrev = useCallback(() => {
    const index = items.findIndex((item) => item.id === current);
    const prev = items[Math.max(0, index - 1)];
    if (prev) {
      controller.current?.scrollTo(prev.id);
    }
  }, [items, current]);

  const handleNext = useCallback(() => {
    const index = items.findIndex((item) => item.id === current);
    const next = items[Math.min(items.length - 1, index + 1)];
    if (next) {
      controller.current?.scrollTo(next.id);
    }
  }, [items, current]);

  const currentIndex = items.findIndex((item) => item.id === current);

  return (
    <Mosaic.Root classNames='dx-container'>
      <Matrix.Root Tile={Tile} items={items} current={current} onCurrentChange={handleCurrentChange} ref={controller}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--caret-left--regular'
                iconOnly
                label='Back'
                onClick={handlePrev}
              />
              <Toolbar.IconButton
                icon='ph--caret-right--regular'
                iconOnly
                label='Forward'
                onClick={handleNext}
              />
              <Toolbar.Text>
                {currentIndex + 1} / {items.length}
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
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<MatrixRootProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Tile: StoryTile,
  },
};

export const WithSurface: Story = {
  render: (args) => <SurfaceStory {...args} />,
  decorators: [
    withPluginManager({
      capabilities: [storySurfaceExtension],
    }),
  ],
  args: {
    Tile: PlankTile,
  },
};
