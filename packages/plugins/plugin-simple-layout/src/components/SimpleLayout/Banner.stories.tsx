//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { type Mock, expect, fn, screen, userEvent, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';
import { type ActionGraphProps, createMenuAction } from '@dxos/react-ui-menu';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { Banner } from './Banner';

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

const meta = {
  title: 'plugins/plugin-simple-layout/Banner',
  component: Banner,
  decorators: [withTheme, withRegistry],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

const DefaultStory = ({ onBack, onAction }: { onBack: () => void; onAction: (action: { id: string }) => void }) => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      title='Document Title'
      showBackButton
      onBack={onBack}
      actions={actions}
      onAction={onAction}
    />
  );
};

export const Default: Story = {
  tags: ['test'],
  args: {
    onBack: fn(),
    onAction: fn(),
  } as any,
  render: (args: any) => <DefaultStory onBack={args.onBack} onAction={args.onAction} />,
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

const NoBackButtonStory = () => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      title='Home'
      showBackButton={false}
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

export const NoBackButton: Story = {
  args: {} as any,
  render: () => <NoBackButtonStory />,
};

const NoActionsStory = () => {
  const actions = useMemo(() => Atom.make(buildEmptyActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      title='Empty Document'
      showBackButton
      onBack={() => console.log('Back clicked')}
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

export const NoActions: Story = {
  args: {} as any,
  render: () => <NoActionsStory />,
};

const LongTitleStory = () => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      title='This is a very long document title that should be truncated when it exceeds the available space'
      showBackButton
      onBack={() => console.log('Back clicked')}
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

export const LongTitle: Story = {
  args: {} as any,
  render: () => <LongTitleStory />,
};

const EmptyStory = () => {
  const actions = useMemo(() => Atom.make(buildEmptyActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

/** Shows the fallback title when no title is provided. */
export const Empty: Story = {
  args: {} as any,
  render: () => <EmptyStory />,
};
