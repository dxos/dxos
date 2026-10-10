//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN, Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { type NodeDefSpec, type NodeViewProps, TextPart, nodeBase } from '@dxos/react-ui-canvas/scene';
import * as Icon from '@dxos/react-ui/Icon';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';
import { mx } from '@dxos/ui-theme';

import { ROOT_SCENE_ID, createCanvas, nodeKey } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

//
// A mock plugin contributing a node type, the way a real one (plugin-uml) does: a schema, a view, and a
// `CanvasCapabilities.NodeType` contribution riding the illustrator's start. Without the plugin, the same
// drawing shows its task as the core base, a box with the task's label.
//

const TaskNode = Schema.Struct({
  type: Schema.Literal('task'),
  ...nodeBase,
  /** The task's title, in the core base's `label`, so it still reads where the type is unknown. */
  label: Schema.String,
  done: Schema.optional(Schema.Boolean.annotate({ title: 'Done' })),
});
type TaskNode = Schema.Schema.Type<typeof TaskNode>;

const isTaskNode = (node: NodeViewProps['node']): node is TaskNode => node.type === 'task';

const TaskNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isTaskNode(node)) {
    return null;
  }
  return (
    <div className='dx-cover flex items-center gap-2 px-3' data-testid='task-node'>
      <Icon.Icon icon={node.done ? 'ph--check-square--regular' : 'ph--square--regular'} size='lg' />
      <TextPart part='label' text={node.label} editing={editing} classNames={mx('grow', node.done && 'line-through')}>
        {node.label}
      </TextPart>
    </div>
  );
};

const taskSpec: NodeDefSpec = {
  name: 'Task',
  icon: 'ph--check-square--regular',
  key: 'K',
  schema: TaskNode,
  component: TaskNodeView,
  create: ({ id, z, center, size }) => ({ type: 'task', id, z, center, size, label: 'Task' }),
  defaultSize: { width: 2, height: 1 },
  resizable: true,
  parts: [{ field: 'label' }],
};

const TaskPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStoryTask'), name: 'Canvas Story Task' }),
).pipe(
  Plugin.addModule({
    id: 'task-node-type',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed([Capability.contribute(CanvasCapabilities.NodeType, { type: 'task', spec: taskSpec })]),
  }),
  Plugin.make,
);

/** The drawing both variants open: a rect and two tasks, one done. */
const seed = (canvas: Drawing.Canvas) => {
  const frame = (x: number) => ({ center: { x, y: 0 }, size: { width: 256, height: 128 } });
  Obj.update(canvas, (canvas) => {
    canvas.content[nodeKey('r')] = {
      kind: 'node',
      scene: ROOT_SCENE_ID,
      node: { id: 'r', type: 'rect', z: 'a0', ...frame(-320), label: 'Rect' },
    };
    canvas.content[nodeKey('t1')] = {
      kind: 'node',
      scene: ROOT_SCENE_ID,
      node: { id: 't1', type: 'task', z: 'a1', ...frame(0), label: 'Write the spec', done: true },
    };
    canvas.content[nodeKey('t2')] = {
      kind: 'node',
      scene: ROOT_SCENE_ID,
      node: { id: 't2', type: 'task', z: 'a2', ...frame(320), label: 'Ship it' },
    };
  });
};

const decorators = (plugins: Plugin.Plugin[]) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin(), ...plugins],
    onInit: async ({ space }) => {
      const canvas = space.db.add(createCanvas());
      seed(canvas);
      const drawing = space.db.add(Drawing.make({ name: 'Tasks', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/NodeTypePlugin',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** With the plugin: the tasks draw with their own view (a checkbox and the title). */
export const WithPlugin: Story = {
  decorators: decorators([TaskPlugin()]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect((await canvas.findAllByTestId('task-node')).length).toBe(2);
  },
};

/** Without the plugin: the same tasks fall back to the core base, a box showing each task's label. */
export const WithoutPlugin: Story = {
  decorators: decorators([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 });
    await expect(await canvas.findByText('Ship it')).toBeInTheDocument();
    await expect(canvas.queryAllByTestId('task-node')).toHaveLength(0);
  },
};
