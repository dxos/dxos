//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { type Mock, expect, fn, screen, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ActionGraphProps, createMenuAction } from '@dxos/react-ui-menu';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { MobileLayout } from '../MobileLayout';

import { AppBar, type AppBarProps } from './AppBar';

const buildEmptyActions = (): ActionGraphProps => ({ nodes: [], edges: [] });

const buildDefaultActions = (): ActionGraphProps => {
  const result: ActionGraphProps = { nodes: [], edges: [] };
  const actions = [
    createMenuAction('action-edit', () => console.log('Edit'), {
      icon: 'ph--pencil--regular',
      label: 'Edit',
    }),
    createMenuAction('action-share', () => console.log('Share'), {
      icon: 'ph--share--regular',
      label: 'Share',
    }),
    createMenuAction('action-delete', () => console.log('Delete'), {
      icon: 'ph--trash--regular',
      label: 'Delete',
    }),
  ];
  result.nodes.push(...actions);
  result.edges.push(...actions.map((a) => ({ source: 'root', target: a.id })));
  return result;
};

type StoryProps = Omit<AppBarProps, 'actions'> & {
  actions: ActionGraphProps;
};

const DefaultStory = ({ actions: actionsProp, ...props }: StoryProps) => {
  const actions = useMemo(() => Atom.make(actionsProp).pipe(Atom.keepAlive), [actionsProp]);
  return (
    <MobileLayout.Root>
      <AppBar {...props} actions={actions} />
    </MobileLayout.Root>
  );
};

const meta = {
  title: 'plugins/plugin-simple-layout/AppBar',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({
      layout: 'column',
      classNames: 'relative',
    }),
    withRegistry,
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  tags: ['test'],
  args: {
    actions: buildDefaultActions(),
    title: 'Document Title',
    showBackButton: true,
    onAction: fn(),
    onBack: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the banner renders with the correct title.
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    await expect(canvas.getByText('Document Title')).toBeInTheDocument();

    // Test back button click.
    const backButton = canvas.getByRole('button', { name: /back/i });
    await expect(backButton).toBeInTheDocument();
    await userEvent.click(backButton);
    await expect(args.onBack).toHaveBeenCalledTimes(1);

    // Test actions menu opens and action fires.
    const menuTrigger = canvas.getByRole('button', { name: /actions/i });
    await expect(menuTrigger).toBeInTheDocument();
    await userEvent.click(menuTrigger);

    // Wait for menu to open and click an action (menu items render in a portal).
    const editAction = await screen.findByRole('menuitem', { name: /edit/i });
    await userEvent.click(editAction);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect((args.onAction as Mock).mock.calls[0][0]).toHaveProperty('id', 'action-edit');
  },
};

export const NoBackButton: Story = {
  args: {
    actions: buildDefaultActions(),
    title: 'Home',
    showBackButton: false,
    onAction: (action) => console.log('Action:', action.id),
  },
};

export const LongTitle: Story = {
  args: {
    actions: buildDefaultActions(),
    title: 'This is a very long document title that should be truncated when it exceeds the available space',
    showBackButton: true,
    onBack: () => console.log('Back clicked'),
    onAction: (action) => console.log('Action:', action.id),
  },
};

export const NoActions: Story = {
  args: {
    actions: buildEmptyActions(),
    title: 'Empty Document',
    showBackButton: true,
    onBack: () => console.log('Back clicked'),
    onAction: (action) => console.log('Action:', action.id),
  },
};

export const Empty: Story = {
  args: {
    actions: buildEmptyActions(),
  },
};
