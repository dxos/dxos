//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

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
import { DeckStoryPlugin } from '@dxos/plugin-deck/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout } from '@dxos/react-ui/testing';

import { MobileNavBar } from '#components';
import { useMobileNavbarActions } from '#hooks';
import { translations } from '#translations';

import { Home } from './Home';

/**
 * A root with one node per disposition Home used to mix together (workspace, user-account, pin-end)
 * plus one ordinary `disposition: 'menu'` action — the shape needed to prove Home dropped two of the
 * three and the navbar's main menu picked them back up as a distinct, later section.
 */
const storyGraph = Capability.inlineModule(
  'home-story-graph',
  { provides: [AppCapabilities.AppGraphBuilder] },
  Effect.fnUntraced(function* () {
    const extension = yield* AppGraphBuilder.createExtension({
      id: 'roots',
      match: GraphNodeMatcher.whenRoot,
      connector: () =>
        Effect.succeed([
          AppGraphNode.make({
            id: 'story-workspace',
            type: 'story-item',
            data: null,
            properties: { label: 'My Space', icon: 'ph--planet--regular', disposition: 'workspace' },
          }),
          AppGraphNode.make({
            id: 'story-account',
            type: 'story-item',
            data: null,
            properties: { label: 'User Profile', icon: 'ph--user--regular', disposition: 'user-account' },
          }),
          AppGraphNode.make({
            id: 'story-settings',
            type: 'story-item',
            data: null,
            properties: { label: 'Settings', icon: 'ph--gear--regular', disposition: 'pin-end' },
          }),
        ]),
      actions: () =>
        Effect.succeed([
          {
            id: 'story-create-space',
            data: () => Effect.void,
            properties: { label: 'Create space', icon: 'ph--plus--regular', disposition: 'menu' },
          },
        ]),
    });

    return [Capability.contribute(AppCapabilities.AppGraphBuilder, extension)];
  }),
);

const HomeStoryPlugin = Plugin.define({
  profile: { key: 'org.dxos.test.home', name: 'Home story' },
}).pipe(Plugin.addModule(storyGraph), Plugin.addModule(AppCapability.translations(translations)), Plugin.make);

/** Expands root synchronously before `Home` mounts, so its first commit already sees the fixture. */
const useExpandRoot = () => {
  const { graph } = useAppGraph();
  useState(() => AppGraph.expandSync(graph, GraphNode.RootId, 'child'));
};

const HomeStoryRoot = () => {
  useExpandRoot();
  return (
    <Dnd.Root>
      <Home />
    </Dnd.Root>
  );
};

/** Home plus the real navbar hook/component, so the menu's displaced-items section is exercised too. */
const NavBarHarness = () => {
  const { actions, onAction } = useMobileNavbarActions();
  return <MobileNavBar actions={actions} onAction={onAction} />;
};

const HomeWithNavBarStoryRoot = () => {
  useExpandRoot();
  return (
    <Dnd.Root>
      <div className='flex h-full flex-col'>
        <div className='flex-1 overflow-hidden'>
          <Home />
        </div>
        <NavBarHarness />
      </div>
    </Dnd.Root>
  );
};

const meta = {
  title: 'plugins/plugin-mobile/components/Home',
  component: Home,
  render: () => <HomeStoryRoot />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ plugins: [...corePlugins(), DeckStoryPlugin(), HomeStoryPlugin()] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Home>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Home must list spaces only — profile and settings moved to the navbar's main menu. Non-vacuous: the
 * fixture contributes a `user-account` and a `pin-end` node alongside the `workspace` one, so this
 * fails on the old mixed-`items` behavior rather than trivially passing on an empty list.
 */
export const SpacesOnly: Story = {
  tags: ['test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('My Space', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(canvas.queryByText('User Profile')).toBeNull();
    await expect(canvas.queryByText('Settings')).toBeNull();
  },
};

/**
 * The items Home no longer lists must still be reachable, one menu-open away: the navbar's main menu
 * keeps its existing `disposition: 'menu'` actions, then a divider, then the displaced account/pin-end
 * items — in that order, at the bottom. `corePlugins()` contributes its own real `menu` actions (e.g.
 * plugin-settings' "Plugin Settings"), so this checks relative position against the divider rather than
 * an exact item count, which would be brittle to what else `corePlugins()` happens to add.
 */
export const MenuShowsDisplacedSection: Story = {
  tags: ['test'],
  render: () => <HomeWithNavBarStoryRoot />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('My Space', undefined, { timeout: 5_000 })).toBeInTheDocument();

    const menuTrigger = canvas.getByRole('button', { name: /main menu/i });
    await userEvent.click(menuTrigger);

    await expect(await screen.findByRole('menuitem', { name: 'User Profile' })).toBeInTheDocument();
    await expect(await screen.findByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();

    const menu = screen.getByRole('menu');
    const ordered = Array.from(menu.querySelectorAll('[role="menuitem"], [role="separator"]')).map((el) => ({
      role: el.getAttribute('role'),
      text: el.textContent,
    }));
    const separatorIndex = ordered.findIndex((entry) => entry.role === 'separator');
    const createSpaceIndex = ordered.findIndex((entry) => entry.text === 'Create space');
    const userProfileIndex = ordered.findIndex((entry) => entry.text === 'User Profile');
    const settingsIndex = ordered.findIndex((entry) => entry.text === 'Settings');

    await expect(separatorIndex).toBeGreaterThan(-1);
    await expect(createSpaceIndex).toBeGreaterThan(-1);
    await expect(createSpaceIndex).toBeLessThan(separatorIndex);
    await expect(userProfileIndex).toBeGreaterThan(separatorIndex);
    await expect(settingsIndex).toBeGreaterThan(separatorIndex);
  },
};
