//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Graph } from '@dxos/app-graph';
import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Focus, Panel, Toolbar } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { type MosaicTileProps, Mosaic } from '@dxos/react-ui-mosaic';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { Plank } from '../../containers/Plank';

import { meta as pluginMeta } from '#meta';
import { translations } from '../../translations';

import { Matrix, type MatrixController, type MatrixRootProps } from './Matrix';
import { StackContext } from '@dxos/react-ui-stack';

import { DeckState } from '#capabilities';

faker.seed(123);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

/**
 * Simple tile with JSON display and attention tracking.
 */
const StoryTile = (props: MosaicTileProps<Obj.Any>) => {
  const attentionAttrs = useAttentionAttributes(props.data.id);
  return (
    <Mosaic.Tile {...props} asChild>
      <Focus.Item asChild border current={props.current}>
        <Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0' {...attentionAttrs}>
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
};

/**
 * Tile that wraps a Plank for content rendering.
 */
const PlankTile = (props: MosaicTileProps<Obj.Any>) => {
  const graph = useMemo(() => Graph.make(), []);
  return (
    <StackContext.Provider value={{ orientation: 'horizontal', size: 'contain', rail: true }}>
      <Plank.Root layoutMode='multi' part='multi' graph={graph}>
        <Mosaic.Tile {...props} asChild>
          <Plank.Content solo={false} companion={false} encapsulate={false}>
            <Plank.Component
              id={props.data.id}
              part='multi'
              node={{
                id: props.data.id,
                data: props.data,
                type: 'test',
                properties: {},
              }}
            />
          </Plank.Content>
        </Mosaic.Tile>
      </Plank.Root>
    </StackContext.Provider>
  );
};

const TestExtension = Capability.contributes(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'story-article',
    role: 'article',
    component: ({ data: { subject } }) => {
      if (!subject) {
        return <Loading />;
      }

      return (
        <Json.Root data={subject}>
          <Json.Content>
            <Json.Data />
          </Json.Content>
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

  const handleCurrentChange = useCallback((id: string | undefined) => {
    setCurrent(id);
  }, []);

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
              <Toolbar.IconButton icon='ph--caret-left--regular' iconOnly label='Back' onClick={handlePrev} />
              <Toolbar.IconButton icon='ph--caret-right--regular' iconOnly label='Forward' onClick={handleNext} />
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
  decorators: [withTheme(), withAttention(), withLayout({ layout: 'fullscreen' })],
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

export const WithPlank: Story = {
  decorators: [
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
      capabilities: [TestExtension],
    }),
  ],
  parameters: {
    translations,
  },
  args: {
    Tile: PlankTile,
  },
};
