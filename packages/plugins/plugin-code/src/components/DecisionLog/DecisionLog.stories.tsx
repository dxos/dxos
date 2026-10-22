//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import { DecisionLog } from './DecisionLog.tsx';

const meta = {
  title: 'plugins/plugin-code/components/DecisionLog',
  component: DecisionLog,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DecisionLog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A person's decisions, then the agent's at the bottom: approvals, supersedes and who an agent acted for. */
export const Default: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deciders = await waitFor(() => canvas.getAllByTestId('decision-log.decider'));
    const actors = deciders.map((section) => section.dataset.actor);
    await expect(actors.indexOf('agent')).toBeGreaterThan(actors.lastIndexOf('user'));
  },
};

/** The Deus log with one decision highlighted, as a gutter chip in the spec selects it. */
export const Selected: Story = {
  args: { content: DEUS_SPEC, selected: 'D-4' },
};

/** A spec with no changelog. */
export const Empty: Story = {
  args: { content: '# No changelog here.' },
};
