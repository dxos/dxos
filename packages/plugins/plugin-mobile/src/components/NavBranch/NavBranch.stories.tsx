//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useEffect } from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Graph from '@dxos/app-graph/Graph';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { corePlugins } from '@dxos/plugin-testing';
import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { NavBranch } from './NavBranch';

// The graph composes a child's id from its parent's path, so an extension matching a contributed node
// has to name the full path, not the id the connector declared.
const BRANCH_ID = `${Node.RootId}/branchWithGroups`;
const EMPTY_BRANCH_ID = `${Node.RootId}/branchEmpty`;
const EMPTY_GROUP_ID = `${BRANCH_ID}/groupEmpty`;
const POPULATED_GROUP_ID = `${BRANCH_ID}/groupPopulated`;
const segment = (id: string) => id.slice(id.lastIndexOf('/') + 1);

const makeBranch = (id: string, label: string) =>
  Node.make({ id: segment(id), type: 'story-branch', data: null, properties: { label, role: 'branch' } });

const makeGroup = (id: string, label: string) =>
  Node.make({ id: segment(id), type: 'story-group', data: null, properties: { label, disposition: 'group' } });

const makeLeaf = (id: string, label: string) =>
  Node.make({ id, type: 'story-leaf', data: { id }, properties: { label, icon: 'ph--file--regular' } });

const whenId = (id: string) => (node: Node.Node) => (node.id === id ? Option.some(node) : Option.none());

/**
 * A branch holding a leaf, a group nothing contributes to, and a group with a child — the shape the
 * fixed mobile plugin set produces, where Communications has no contributor at all.
 */
const storyGraph = Capability.inlineModule(
  'nav-branch-story-graph',
  { provides: [AppCapabilities.AppGraphBuilder] },
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'roots',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([makeBranch(BRANCH_ID, 'With groups'), makeBranch(EMPTY_BRANCH_ID, 'Empty branch')]),
      }),
      GraphBuilder.createExtension({
        id: 'branchChildren',
        match: whenId(BRANCH_ID),
        connector: () =>
          Effect.succeed([
            makeLeaf('leaf-a', 'Leaf A'),
            makeGroup(EMPTY_GROUP_ID, 'Empty group'),
            makeGroup(POPULATED_GROUP_ID, 'Populated group'),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'populatedGroupChildren',
        match: whenId(POPULATED_GROUP_ID),
        connector: () => Effect.succeed([makeLeaf('leaf-b', 'Leaf B')]),
      }),
    ]);

    return [Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat())];
  }),
);

const NavBranchStoryPlugin = Plugin.define({
  profile: { key: 'org.dxos.test.navBranch', name: 'NavBranch story' },
}).pipe(Plugin.addModule(storyGraph), Plugin.addModule(AppCapability.translations(translations)), Plugin.make);

const StoryRoot = ({ id }: { id: string }) => {
  const { graph } = useAppGraph();

  // Nothing else expands the graph root here, so without this the branch nodes never materialise and
  // `NavBranch`'s own path expansion has no node to walk from.
  useEffect(() => {
    Graph.expandSync(graph, Node.RootId, 'child');
  }, [graph]);

  return (
    <Dnd.Root>
      <NavBranch id={id} />
    </Dnd.Root>
  );
};

const meta = {
  title: 'plugins/plugin-mobile/components/NavBranch',
  component: NavBranch,
  render: ({ id }) => <StoryRoot id={id} />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ plugins: [...corePlugins(), NavBranchStoryPlugin()] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof NavBranch>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A group is a label over its children, so one with nothing under it must not offer a row — tapping it
 * would push a panel that can never hold anything.
 */
export const HidesEmptyGroups: Story = {
  args: { id: BRANCH_ID },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Leaf A')).toBeInTheDocument();
    await expect(await canvas.findByText('Populated group')).toBeInTheDocument();
    await expect(canvas.queryByText('Empty group')).toBeNull();
  },
};

/** A branch that legitimately has nothing in it still has to say so rather than render a void. */
export const EmptyBranch: Story = {
  args: { id: EMPTY_BRANCH_ID },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('status')).toHaveTextContent('Nothing here yet.');
  },
};
