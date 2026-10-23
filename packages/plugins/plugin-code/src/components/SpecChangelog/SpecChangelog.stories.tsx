//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { type SourceKey } from '#sync';
import { translations } from '#translations';

import REVIEW_DIALECT from '../../../../../reflect/deus/lang/review.mdl?raw';
import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import CODE_SPEC from '../../../../plugin-code/PLUGIN.mdl?raw';
import CODE_REVIEW from '../../../../plugin-code/PLUGIN.review.mdl?raw';
import CONNECTOR_EVENTS_SPEC from '../../../../plugin-connector/spec/EVENTS.mdl?raw';
import FILE_SYSTEM_SPEC from '../../../../plugin-file-system/PLUGIN.mdl?raw';
import FILE_SYSTEM_REVIEW from '../../../../plugin-file-system/PLUGIN.review.mdl?raw';
import GITHUB_FILE_SYNC_SPEC from '../../../../plugin-github/spec/FILE-SYNC.mdl?raw';
import GITHUB_SYNC_SPEC from '../../../../plugin-github/spec/SYNC.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from '../ChangelogGraph/__fixtures__/inbox-sync.mdl?raw';
import { parseReview } from '../SpecModel/index.ts';
import { SpecChangelog } from './SpecChangelog.tsx';

const meta = {
  title: 'plugins/plugin-code/components/SpecChangelog',
  component: SpecChangelog,
  decorators: [withRegistry, withMosaic(), withTheme(), withLayout({ layout: 'fullscreen' })],
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
    for (const [view, child] of [
      ['log', 'decision-log.decision'],
      ['definitions', 'definition-graph.definition'],
      ['data', 'data-model.type'],
      ['api', 'api-surface.op'],
      ['decisions', 'changelog-graph.decision'],
    ] as const) {
      await userEvent.click(canvas.getByTestId(`spec-changelog.view.${view}`));
      await waitFor(async () => {
        await expect(panel.dataset.view).toBe(view);
        await expect(canvas.getAllByTestId(child).length).toBeGreaterThan(0);
      }, TIMEOUT);
    }
  },
};

/** Code keys open on GitHub, at the branch the reviews were written against. */
const openOnGitHub = ({ owner, repo, path }: SourceKey) =>
  window.open(`https://github.com/${owner}/${repo}/blob/worktree-mdl-spec-ide/${path}`, '_blank', 'noopener');

/** plugin-code's own spec with its review: status and code chips in the margin, code boxes on the graph. */
export const SpecIde: Story = {
  args: { content: CODE_SPEC, review: CODE_REVIEW, onOpenCode: openOnGitHub, defaultView: 'decisions' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('spec-review.gutter-chip').length).toBeGreaterThan(0), TIMEOUT);
    await waitFor(
      () => expect(canvas.getAllByTestId('spec-editor.implementation-chip').length).toBeGreaterThan(0),
      TIMEOUT,
    );
  },
};

/** A real spec reviewed against its code by the spec-review skill, opened on the Review view. */
export const FileSystemReview: Story = {
  args: { content: FILE_SYSTEM_SPEC, review: FILE_SYSTEM_REVIEW, onOpenCode: openOnGitHub, defaultView: 'review' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getAllByTestId('verdict-card').length).toBe(parseReview(FILE_SYSTEM_REVIEW).verdicts.length),
      TIMEOUT,
    );
  },
};

/** The review dialect: the `verdict` block a review is made of. */
export const ReviewDialect: Story = {
  args: { content: REVIEW_DIALECT, defaultView: 'definitions' },
};

// The GitHub sync stories come last: laying out their diagrams keeps the page busy after each story ends.

/** GitHub sync, part 1: polling over one object model; its ```diagram fences render inline. */
export const GitHubSync: Story = {
  args: { content: GITHUB_SYNC_SPEC },
};

/** GitHub sync, part 2: extensible two-way file sync. */
export const GitHubFileSync: Story = {
  args: { content: GITHUB_FILE_SYNC_SPEC },
};

/** GitHub sync, part 3: connector event dispatch. */
export const ConnectorEvents: Story = {
  args: { content: CONNECTOR_EVENTS_SPEC },
};
