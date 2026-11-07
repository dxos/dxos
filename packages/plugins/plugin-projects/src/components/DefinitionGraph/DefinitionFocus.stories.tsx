//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import CODE_SPEC from '../../../../plugin-code/PLUGIN.mdl?raw';
import { DefinitionFocus } from './DefinitionFocus.tsx';

const meta = {
  title: 'plugins/plugin-projects/components/DefinitionFocus',
  component: DefinitionFocus,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DefinitionFocus>;

export default meta;

type Story = StoryObj<typeof meta>;

const TIMEOUT = { timeout: 10_000 };

const SOFTWARE = ['org.dxos.spec.software'];

/**
 * The cursor in CodeProject's block: the features naming it above, what it names below, its checks and decisions.
 * Clicking a card centres on that block.
 */
export const Default: Story = {
  args: { content: CODE_SPEC, dialects: SOFTWARE, cursor: CODE_SPEC.indexOf('type CodeProject') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const focus = () => canvas.getByTestId('definition-related.focus');
    await waitFor(() => expect(focus()).toHaveAttribute('data-definition', 'CodeProject'), TIMEOUT);
    const above = within(canvas.getByTestId('definition-related.above')).getAllByTestId('definition-related.node');
    await expect(above.length).toBeGreaterThan(1);
    await waitFor(() => expect(canvas.getAllByTestId('definition-graph.connector').length).toBeGreaterThan(1), TIMEOUT);
    const next = above[0].dataset.definition;
    await userEvent.click(above[0]);
    await waitFor(() => expect(focus()).toHaveAttribute('data-definition', next), TIMEOUT);
  },
};

/** With no cursor in the spec, it asks for one. */
export const Empty: Story = {
  args: { content: CODE_SPEC, dialects: SOFTWARE },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByTestId('definition-focus.empty')).toBeInTheDocument();
  },
};
