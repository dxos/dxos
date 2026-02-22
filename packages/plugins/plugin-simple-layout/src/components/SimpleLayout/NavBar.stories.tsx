//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { type Mock, expect, fn, screen, userEvent, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';
import { type ActionGraphProps, createGapSeparator, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { NavBar } from './NavBar';

const MAIN_MENU_GROUP_ID = 'navbar-main-menu';

const buildEmptyActions = (): ActionGraphProps => ({ nodes: [], edges: [] });

const buildCompanionOnlyActions = (): ActionGraphProps => {
  const result: ActionGraphProps = { nodes: [], edges: [] };
  const companions = [
    createMenuAction('companion-browse', () => console.log('Browse'), {
      icon: 'ph--house--regular',
      label: 'Browse',
      iconOnly: true,
    }),
    createMenuAction('companion-notifications', () => console.log('Notifications'), {
      icon: 'ph--bell--regular',
      label: 'Notifications',
      iconOnly: true,
    }),
    createMenuAction('companion-profile', () => console.log('Profile'), {
      icon: 'ph--user--regular',
      label: 'Profile',
      iconOnly: true,
    }),
  ];
  result.nodes.push(...companions);
  result.edges.push(...companions.map((c) => ({ source: 'root', target: c.id })));
  return result;
};

const buildDefaultActions = (): ActionGraphProps => {
  const result: ActionGraphProps = { nodes: [], edges: [] };
  const gapSeparator = createGapSeparator('navbar-gap');
  const mainMenuGroup = createMenuItemGroup(MAIN_MENU_GROUP_ID, {
    variant: 'dropdownMenu',
    icon: 'ph--plus--regular',
    iconOnly: true,
    label: 'Main menu',
    testId: 'simpleLayoutPlugin.addSpace',
  });
  const companions = [
    createMenuAction('companion-browse', () => console.log('Browse'), {
      icon: 'ph--house--regular',
      label: 'Browse',
      iconOnly: true,
    }),
    createMenuAction('companion-notifications', () => console.log('Notifications'), {
      icon: 'ph--bell--regular',
      label: 'Notifications',
      iconOnly: true,
    }),
  ];
  const menuActions = [
    createMenuAction('action-create-space', () => console.log('Create space'), {
      icon: 'ph--planet--regular',
      label: 'Create space',
    }),
    createMenuAction('action-join-space', () => console.log('Join space'), {
      icon: 'ph--sign-in--regular',
      label: 'Join space',
    }),
    createMenuAction('action-settings', () => console.log('Settings'), {
      icon: 'ph--gear--regular',
      label: 'Settings',
    }),
  ];
  result.nodes.push(...companions, ...gapSeparator.nodes, mainMenuGroup, ...menuActions);
  result.edges.push(
    ...companions.map((c) => ({ source: 'root', target: c.id })),
    ...gapSeparator.edges,
    { source: 'root', target: mainMenuGroup.id },
    ...menuActions.map((action) => ({ source: MAIN_MENU_GROUP_ID, target: action.id })),
  );
  return result;
};

const meta = {
  title: 'plugins/plugin-simple-layout/NavBar',
  component: NavBar,
  decorators: [withTheme(), withRegistry],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof NavBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const DefaultStory = ({ onAction }: { onAction: (action: { id: string }) => void }) => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);

  return <NavBar classNames='border-y border-separator' actions={actions} onAction={onAction} />;
};

export const Default: Story = {
  tags: ['test'],
  args: {
    onAction: fn(),
  } as any,
  render: (args: any) => <DefaultStory onAction={args.onAction} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the navbar renders with the toolbar.
    await expect(canvas.getByRole('toolbar')).toBeInTheDocument();

    // Test companion action click (Browse button).
    const browseButton = canvas.getByRole('button', { name: /browse/i });
    await expect(browseButton).toBeInTheDocument();
    await userEvent.click(browseButton);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect((args.onAction as Mock).mock.calls[0][0]).toHaveProperty('id', 'companion-browse');

    // Test dropdown menu opens and action fires.
    const menuTrigger = canvas.getByRole('button', { name: /main menu/i });
    await expect(menuTrigger).toBeInTheDocument();
    await userEvent.click(menuTrigger);

    // Wait for menu to open and click an action (menu items render in a portal).
    const createSpaceAction = await screen.findByRole('menuitem', { name: /create space/i });
    await userEvent.click(createSpaceAction);
    await expect(args.onAction).toHaveBeenCalledTimes(2);
    await expect((args.onAction as Mock).mock.calls[1][0]).toHaveProperty('id', 'action-create-space');
  },
};

const CompanionsOnlyStory = () => {
  const actions = useMemo(() => Atom.make(buildCompanionOnlyActions()).pipe(Atom.keepAlive), []);

  return <NavBar actions={actions} onAction={(action) => console.log('Action:', action.id)} />;
};

export const CompanionsOnly: Story = {
  args: {} as any,
  render: () => <CompanionsOnlyStory />,
};

const EmptyStory = () => {
  const actions = useMemo(() => Atom.make(buildEmptyActions()).pipe(Atom.keepAlive), []);

  return <NavBar actions={actions} onAction={(action) => console.log('Action:', action.id)} />;
};

export const Empty: Story = {
  args: {} as any,
  render: () => <EmptyStory />,
};
