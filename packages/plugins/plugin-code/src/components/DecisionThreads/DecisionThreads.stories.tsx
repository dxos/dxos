//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import CODE_SPEC from '../../../PLUGIN.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import { DecisionThreads } from './DecisionThreads.tsx';

const meta = {
  title: 'plugins/plugin-code/components/DecisionThreads',
  component: DecisionThreads,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DecisionThreads>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One direction, the agent's design filling it in, and the person's approvals and overrides; opening it draws the rail. */
export const Default: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [toggle] = await waitFor(() => canvas.getAllByTestId('decision-threads.toggle'));
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.getAllByTestId('decision-threads.decision').length).toBeGreaterThan(1));
  },
};

/** plugin-code's own changelog, with one decision selected as a gutter chip selects it: its thread opens on it. */
export const Selected: Story = {
  args: { content: CODE_SPEC, selected: 'D-72' },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-decision="D-72"]')).toHaveAttribute('data-selected'));
  },
};
