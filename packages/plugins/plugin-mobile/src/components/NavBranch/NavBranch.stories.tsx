//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useLayoutEffect, useRef, useState } from 'react';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { corePlugins } from '@dxos/plugin-testing';
import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { NavBranch } from './NavBranch.tsx';

// The graph composes a child's id from its parent's path, so an extension matching a contributed node
// has to name the full path, not the id the connector declared.
const BRANCH_ID = `${GraphNode.RootId}/branchWithGroups`;
const EMPTY_BRANCH_ID = `${GraphNode.RootId}/branchEmpty`;
const EMPTY_GROUP_ID = `${BRANCH_ID}/groupEmpty`;
const POPULATED_GROUP_ID = `${BRANCH_ID}/groupPopulated`;
const segment = (id: string) => id.slice(id.lastIndexOf('/') + 1);

const makeBranch = (id: string, label: string) =>
  AppGraphNode.make({ id: segment(id), type: 'story-branch', data: null, properties: { label, role: 'branch' } });

const makeGroup = (id: string, label: string) =>
  AppGraphNode.make({ id: segment(id), type: 'story-group', data: null, properties: { label, disposition: 'group' } });

const makeLeaf = (id: string, label: string) =>
  AppGraphNode.make({ id, type: 'story-leaf', data: { id }, properties: { label, icon: 'ph--file--regular' } });

const whenId = (id: string) => (node: AppGraphNode.Node) => (node.id === id ? Option.some(node) : Option.none());

/**
 * A branch holding a leaf, a group nothing contributes to, and a group with a child — the shape the
 * fixed mobile plugin set produces, where Communications has no contributor at all.
 */
const storyGraph = Capability.inlineModule(
  'nav-branch-story-graph',
  { provides: [AppCapabilities.AppGraphBuilder] },
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'roots',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([makeBranch(BRANCH_ID, 'With groups'), makeBranch(EMPTY_BRANCH_ID, 'Empty branch')]),
      }),
      AppGraphBuilder.createExtension({
        id: 'branchChildren',
        match: whenId(BRANCH_ID),
        connector: () =>
          Effect.succeed([
            makeLeaf('leaf-a', 'Leaf A'),
            makeGroup(EMPTY_GROUP_ID, 'Empty group'),
            makeGroup(POPULATED_GROUP_ID, 'Populated group'),
          ]),
      }),
      AppGraphBuilder.createExtension({
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

  // Expanded during this first render, before `NavBranch` mounts, so the branch arrives with its own
  // children already resolved — the state the panel above it leaves behind in the app. The cold-mount
  // story is about whether the *groups* one level further down are known, not about this.
  useState(() => {
    AppGraph.expandSync(graph, GraphNode.RootId, 'child');
    AppGraph.expandSync(graph, id, 'child');
  });

  return (
    <Dnd.Root>
      <NavBranch id={id} />
    </Dnd.Root>
  );
};

/**
 * Records, after every commit and before the browser paints it, whether `watch` was on screen. A probe
 * running in a passive effect (or in `play`) only ever sees the settled DOM, which is exactly where a
 * cold-mount flicker hides.
 */
const CommitProbe = ({ watch, children }: PropsWithChildren<{ watch: string }>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const missingRef = useRef(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    if (!root.textContent?.includes(watch)) {
      missingRef.current += 1;
    }
    root.dataset.missingCommits = String(missingRef.current);
  });

  return (
    // `display: contents` so the probe does not become a box in the layout it is measuring.
    <div ref={rootRef} className='contents' data-testid='commit-probe' data-missing-commits='0'>
      {children}
    </div>
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

    // Generous timeout: this is the first story to mount the plugin manager, and activating it on a
    // cold worker can outrun the default 1s.
    await expect(await canvas.findByText('Leaf A', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(await canvas.findByText('Populated group')).toBeInTheDocument();
    await expect(canvas.queryByText('Empty group')).toBeNull();
  },
};

/**
 * The rows are filtered on the groups' children, which a cold mount does not know yet: an unexpanded
 * group reads as childless, so a populated row would be dropped from the first commit and pop back in
 * once the expansion landed. It must be on screen in every commit, not merely in the settled one.
 */
export const PopulatedGroupSurvivesColdMount: Story = {
  args: { id: BRANCH_ID },
  render: ({ id }) => (
    <CommitProbe watch='Populated group'>
      <StoryRoot id={id} />
    </CommitProbe>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Populated group', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(canvas.queryByText('Empty group')).toBeNull();
    await expect(canvas.getByTestId('commit-probe')).toHaveAttribute('data-missing-commits', '0');
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
