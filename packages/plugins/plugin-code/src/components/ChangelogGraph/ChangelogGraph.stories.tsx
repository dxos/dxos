//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import BOOKMARKS_SPEC from './__fixtures__/bookmarks.mdl?raw';
import CANVAS_AUTOGROW_SPEC from './__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from './__fixtures__/inbox-sync.mdl?raw';
import { ChangelogGraph } from './ChangelogGraph.tsx';
import { buildChangelogGraph } from './decision-model.ts';

const meta = {
  title: 'plugins/plugin-code/components/ChangelogGraph',
  component: ChangelogGraph,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof ChangelogGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

const countDecisions = (content: string) =>
  buildChangelogGraph(content).nodes.filter((node) => node.kind === 'decision').length;

const expectDecisions =
  (content: string): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getAllByTestId('changelog-graph.decision')).toHaveLength(countDecisions(content)),
      { timeout: 10_000 },
    );
  };

/** The Deus spec's own log, backfilled from the session that built the changelog: two supersedes and many fills-ins. */
export const Deus: Story = {
  args: { content: DEUS_SPEC },
  play: expectDecisions(DEUS_SPEC),
};

/** The Deus log with a node per spec block it constrains (`affects:`). */
export const DeusWithAffects: Story = {
  args: { content: DEUS_SPEC, affects: true },
  play: expectDecisions(DEUS_SPEC),
};

/** Written almost entirely by two people in design review; one agent entry, approved. */
export const MostlyHuman: Story = {
  args: { content: BOOKMARKS_SPEC },
  play: expectDecisions(BOOKMARKS_SPEC),
};

/** One line of direction, an agent's design, and the person approving most of it and overriding the rest. */
export const MostlyAgent: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async (context) => {
    await expectDecisions(CANVAS_AUTOGROW_SPEC)?.(context);
    const canvas = within(context.canvasElement);
    await expect(canvas.getAllByTestId('changelog-graph.approved').length).toBeGreaterThan(0);
    await expect(canvas.getAllByTestId('changelog-graph.principal').length).toBeGreaterThan(0);
  },
};

/** How mail reaches the inbox, revised several times: chains of decisions each replacing the last. */
export const SupersedeChain: Story = {
  args: { content: INBOX_SYNC_SPEC },
  play: async (context) => {
    await expectDecisions(INBOX_SYNC_SPEC)?.(context);
    const canvas = within(context.canvasElement);
    await expect(canvas.getAllByTestId('changelog-graph.superseded')).toHaveLength(4);
  },
};
