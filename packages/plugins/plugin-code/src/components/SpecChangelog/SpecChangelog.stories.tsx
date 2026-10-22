//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from '../ChangelogGraph/__fixtures__/inbox-sync.mdl?raw';
import { SpecChangelog } from './SpecChangelog.tsx';

const meta = {
  title: 'plugins/plugin-code/components/SpecChangelog',
  component: SpecChangelog,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof SpecChangelog>;

export default meta;

type Story = StoryObj<typeof meta>;

const TIMEOUT = { timeout: 10_000 };

/** The Deus spec beside its decisions; clicking a gutter chip selects that decision's card. */
export const Deus: Story = {
  args: { content: DEUS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chips = await waitFor(() => canvas.getAllByTestId('spec-changelog.gutter-chip'), TIMEOUT);
    await expect(chips.length).toBeGreaterThan(0);
    await userEvent.click(chips[0]);
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="changelog-graph.decision"][data-selected]')).not.toBeNull(),
    );
  },
};

/** An agent-heavy spec: most requirements carry dashed agent chips, some approved or replaced by a person. */
export const MostlyAgent: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
};

/** Requirements whose history is a chain of replacements; superseded chips are struck through. */
export const SupersedeChain: Story = {
  args: { content: INBOX_SYNC_SPEC },
};

/** The toolbar switches the panel between all five views of one spec. */
export const SwitchViews: Story = {
  args: { content: CALLS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await waitFor(() => canvas.getByTestId('spec-changelog.panel'), TIMEOUT);
    for (const view of ['log', 'definitions', 'data', 'api', 'decisions']) {
      await userEvent.click(canvas.getByTestId(`spec-changelog.view.${view}`));
      await waitFor(() => expect(panel.dataset.view).toBe(view));
    }
  },
};
