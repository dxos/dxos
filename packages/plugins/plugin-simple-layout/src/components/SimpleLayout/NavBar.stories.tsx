//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

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
  decorators: [withTheme, withRegistry],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof NavBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const DefaultStory = () => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);
  return (
    <NavBar
      classNames='border-bs border-separator'
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

export const Default: Story = {
  args: {} as any,
  render: () => <DefaultStory />,
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
