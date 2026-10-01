//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { Next } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Dnd } from '@dxos/react-ui-dnd';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { DeckState, OperationHandler } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import type { DeckCapabilities } from '#types';

import { Plank } from '../Plank/index.ts';
import { Matrix, type MatrixController, type MatrixRootProps } from './Matrix.tsx';

random.seed(123);

const TestPlugin = Plugin.define<DeckCapabilities.DeckPluginOptions>(pluginMeta).pipe(
  Plugin.addModule(DeckState),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

/**
 * Simple tile with JSON display and attention tracking.
 */
const StoryTile = (props: MosaicTileProps<Obj.Any>) => {
  const attentionAttrs = useAttentionAttributes(props.data.id);
  return (
    <Mosaic.Tile {...props} asChild>
      <Next.Focus.Item asChild border current={props.current}>
        <Next.Panel.Root classNames='dx-current dx-hover w-full md:w-[50rem] snap-start shrink-0' {...attentionAttrs}>
          <Next.Panel.Header>
            <Next.Toolbar.Root>
              <p>{Obj.getLabel(props.data)}</p>
            </Next.Toolbar.Root>
          </Next.Panel.Header>
          <Next.Panel.Body asChild>
            <JsonHighlighter data={props.data} />
          </Next.Panel.Body>
        </Next.Panel.Root>
      </Next.Focus.Item>
    </Mosaic.Tile>
  );
};

/**
 * Tile that renders a node-bound Plank (sigil/title + content Surface).
 */
const PlankTile = (props: MosaicTileProps<Obj.Any>) => {
  const node = useMemo<AppGraphNode.Node>(
    () => ({ id: props.data.id, type: 'test', data: props.data, properties: { label: Obj.getLabel(props.data) } }),
    [props.data],
  );
  return (
    <Mosaic.Tile {...props} classNames='w-full md:w-[50rem] shrink-0'>
      <Plank node={node} />
    </Mosaic.Tile>
  );
};

const TestExtension = Capability.contribute(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'storyArticle',
    filter: Surface.makeFilter(AppSurface.Article),
    component: ({ data: { subject } }) => {
      if (!subject) {
        return <Loading />;
      }

      return <JsonHighlighter data={subject} />;
    },
  }),
);

type StoryArgs = Pick<MatrixRootProps, 'Tile'>;

const DefaultStory = ({ Tile }: StoryArgs) => {
  const items = useMemo(
    () => [
      Organization.make({ name: random.company.name() }),
      Person.make({ fullName: random.person.fullName() }),
      Text.make({ name: 'Bio', content: random.lorem.paragraphs(10) }),
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
    <Dnd.Root>
      <Matrix.Root Tile={Tile} items={items} current={current} onCurrentChange={handleCurrentChange} ref={controller}>
        <Next.Panel.Root>
          <Next.Panel.Header>
            <Next.Toolbar.Root>
              <Next.Button icon='ph--caret-left--regular' iconOnly label='Back' onClick={handlePrev} />
              <Next.Button icon='ph--caret-right--regular' iconOnly label='Forward' onClick={handleNext} />
              <Next.Toolbar.Text>
                {currentIndex + 1} / {items.length}
              </Next.Toolbar.Text>
            </Next.Toolbar.Root>
          </Next.Panel.Header>
          <Next.Panel.Body asChild>
            <Matrix.Content>
              <Matrix.Viewport />
            </Matrix.Content>
          </Next.Panel.Body>
        </Next.Panel.Root>
      </Matrix.Root>
    </Dnd.Root>
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
