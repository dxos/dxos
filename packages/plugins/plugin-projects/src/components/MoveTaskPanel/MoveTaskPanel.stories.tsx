//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import * as Project from '@dxos/compute/Project';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { MoveTaskPanel, type MoveTaskPanelProps } from './MoveTaskPanel.tsx';

type StoryArgs = Pick<MoveTaskPanelProps, 'onSelect'> & { names: (string | undefined)[] };

// Projects are built here rather than passed as args: storybook walks args to wrap spies, and
// assigning into an ECHO object outside `Obj.update` throws.
const DefaultStory = ({ names, onSelect }: StoryArgs) => {
  const projects = useMemo(() => names.map((name) => Project.make(name ? { name } : {})), [names]);
  return <MoveTaskPanel projects={projects} onSelect={onSelect} />;
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-projects/components/MoveTaskPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: {
    names: ['Website', 'Launch', undefined],
    onSelect: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // An unnamed project is labelled rather than left blank.
    await waitFor(async () => expect(canvas.getByText('Launch')).toBeInTheDocument());
    await expect(canvas.getByText('Untitled project')).toBeInTheDocument();

    await userEvent.type(canvas.getByTestId('move-task-panel.input'), 'web');
    await waitFor(async () => expect(canvas.queryByText('Launch')).toBeNull());
    await userEvent.click(canvas.getByText('Website'));
    await waitFor(async () => expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Website' })));
  },
};

export const Empty: Story = {
  args: { names: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('move-task-panel.empty')).toBeInTheDocument();
  },
};
