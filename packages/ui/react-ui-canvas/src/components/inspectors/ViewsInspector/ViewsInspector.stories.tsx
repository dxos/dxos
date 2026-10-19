//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { reduceIntent } from '../../../engine/index.ts';
import { type ElementId, type SceneId, type SceneMap } from '../../../model/index.ts';
import { createNestedDeepTree, createNestedSimpleTree, createObjectsTree } from '../../../testing/index.ts';
import { type ViewRowSelection, restackZ } from '../../../utils/index.ts';
import { withInspectorFrame } from '../../panels/testing.ts';
import { ViewsInspector } from './ViewsInspector.tsx';

const FIXTURES = {
  'nested-simple': createNestedSimpleTree,
  'nested-deep': createNestedDeepTree,
  'objects': createObjectsTree,
};

type StoryArgs = {
  fixture: keyof typeof FIXTURES;
  onSelect?: (selection: ViewRowSelection) => void;
  onOpen?: (path: SceneId[]) => void;
};

/** The views tree over a shared fixture; picking a row opens its View and selects its element, as the canvas would. */
const DefaultStory = ({ fixture, onSelect, onOpen }: StoryArgs) => {
  const initial = useMemo((): { scenes: SceneMap; root: SceneId } => {
    const tree = FIXTURES[fixture]();
    return { scenes: Object.fromEntries(tree.scenes.map((scene) => [scene.id, scene])), root: tree.root };
  }, [fixture]);
  // Local state stands in for the store: a drag restacks the element in its scene.
  const [scenes, setScenes] = useState(initial.scenes);
  const [selected, setSelected] = useState<ReadonlySet<ElementId>>(new Set());
  const [path, setPath] = useState<SceneId[]>([initial.root]);
  return (
    <ViewsInspector
      scenes={scenes}
      root={initial.root}
      path={path}
      selected={selected}
      onSelect={(selection) => {
        setPath(selection.path);
        setSelected(new Set(selection.ids));
        onSelect?.(selection);
      }}
      onOpen={(next) => {
        setPath(next);
        setSelected(new Set());
        onOpen?.(next);
      }}
      onReorder={({ container, element, target, position }) =>
        setScenes((scenes) => {
          const scene = scenes[container];
          const z = scene && restackZ(scene, element, target, position);
          return scene && z
            ? { ...scenes, [container]: reduceIntent(scene, { kind: 'reorder', id: element, z }) }
            : scenes;
        })
      }
    />
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/inspectors/ViewsInspector',
  render: DefaultStory,
  decorators: [
    withInspectorFrame({
      id: 'views',
      title: 'Views',
      icon: 'ph--tree-structure--regular',
      order: 0,
      show: 'empty',
      defaultOpen: true,
    }),
    withRegistry,
    withTheme(),
    withLayout({ layout: 'centered' }),
  ],
  args: { fixture: 'nested-simple' },
  argTypes: { fixture: { control: { type: 'inline-radio' }, options: Object.keys(FIXTURES) } },
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** One View in the root: A, B and View C, which holds D → E. */
export const Default: Story = {};

/** Views nested several levels deep. */
export const NestedDeep: Story = { args: { fixture: 'nested-deep' } };

/** Objects placed across Views: each instance shows its object's contents, read-only. */
export const Objects: Story = { args: { fixture: 'objects' } };

/** Rows select their element; a View row opens the View by its path. */
export const Test: Story = {
  args: { fixture: 'nested-simple', onSelect: fn(), onOpen: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // 1. The root View is open, showing its nodes, its View and its links.
    await waitFor(() => expect(canvas.getByTestId('views-row-a')).toBeInTheDocument());
    await expect(canvas.getByTestId('views-row-c')).toBeInTheDocument();

    // 2. Picking a node's row reports it, with the View it is in.
    await userEvent.click(canvas.getByTestId('views-row-b'));
    await waitFor(() =>
      expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b'], path: ['scene:root'] })),
    );

    // 3. A View row opens that View by its path from the root.
    await userEvent.hover(canvas.getByTestId('views-row-c'));
    await userEvent.click(canvas.getByTestId('views-open-c'));
    await expect(args.onOpen).toHaveBeenCalledWith(['scene:root', 'c']);
  },
};
