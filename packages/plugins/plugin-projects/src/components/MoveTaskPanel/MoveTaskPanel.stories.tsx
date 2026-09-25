//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import * as Project from '@dxos/compute/Project';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { MoveTaskPanel } from './MoveTaskPanel.tsx';

const meta: Meta<typeof MoveTaskPanel> = {
  title: 'plugins/plugin-projects/components/MoveTaskPanel',
  component: MoveTaskPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: {
    projects: [Project.make({ name: 'Website' }), Project.make({ name: 'Launch' }), Project.make({})],
    onSelect: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Sorted by name, with an unnamed project labelled rather than blank.
    await waitFor(async () => expect(canvas.getByText('Launch')).toBeInTheDocument());
    await expect(canvas.getByText('Untitled project')).toBeInTheDocument();

    await userEvent.type(canvas.getByTestId('move-task-panel.input'), 'web');
    await waitFor(async () => expect(canvas.queryByText('Launch')).toBeNull());
    await userEvent.click(canvas.getByText('Website'));
    await waitFor(async () => expect(args.onSelect).toHaveBeenCalledWith(args.projects[0]));
  },
};

export const Empty: Story = {
  args: { projects: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('move-task-panel.empty')).toBeInTheDocument();
  },
};
