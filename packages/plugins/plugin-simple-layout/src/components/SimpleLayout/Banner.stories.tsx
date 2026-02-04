//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

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

const DefaultStory = () => {
  const actions = useMemo(() => Atom.make(buildDefaultActions()).pipe(Atom.keepAlive), []);

  return (
    <Banner
      classNames='border-be border-separator'
      title='Document Title'
      showBackButton
      onBack={() => console.log('Back clicked')}
      actions={actions}
      onAction={(action) => console.log('Action:', action.id)}
    />
  );
};

export const Default: Story = {
  args: {} as any,
  render: () => <DefaultStory />,
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
