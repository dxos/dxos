//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as EffectEx from '@dxos/effect/EffectEx';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { type SourceKey } from '#sync';
import { translations } from '#translations';

import ECHO_QUERY_SPEC from '../../../../../core/echo/echo-client/spec/QUERY.mdl?spec';
import REVIEW_DIALECT from '../../../../../reflect/deus/lang/review.mdl?spec';
import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?spec';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?spec';
import CODE_SPEC from '../../../../plugin-code/PLUGIN.mdl?spec';
import CODE_REVIEW from '../../../../plugin-code/PLUGIN.review.mdl?spec';
import CONNECTOR_EVENTS_SPEC from '../../../../plugin-connector/spec/EVENTS.mdl?spec';
import FILE_SYSTEM_SPEC from '../../../../plugin-file-system/PLUGIN.mdl?spec';
import FILE_SYSTEM_REVIEW from '../../../../plugin-file-system/PLUGIN.review.mdl?spec';
import GITHUB_FILE_SYNC_SPEC from '../../../../plugin-github/spec/FILE-SYNC.mdl?spec';
import GITHUB_SYNC_SPEC from '../../../../plugin-github/spec/SYNC.mdl?spec';
import { type SpecFile, resolveSpecText, useSpecTexts } from '../../testing/index.ts';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?spec';
import INBOX_SYNC_SPEC from '../ChangelogGraph/__fixtures__/inbox-sync.mdl?spec';
import { parseReview } from '../SpecModel/index.ts';
import { SpecChangelog, type SpecChangelogProps } from './SpecChangelog.tsx';

type SpecFileChangelogProps = Omit<SpecChangelogProps, 'content' | 'review'> & {
  content: SpecFile;
  review?: SpecFile;
};

/** Renders the published copy of each spec in a static build, so a spec-only republish needs no rebuild. */
const SpecFileChangelog = ({ content, review, ...props }: SpecFileChangelogProps) => {
  const texts = useSpecTexts({ content, review });
  return texts?.content === undefined ? null : (
    <SpecChangelog {...props} content={texts.content} review={texts.review} />
  );
};

const meta = {
  title: 'plugins/plugin-code/components/SpecChangelog',
  component: SpecFileChangelog,
  decorators: [withRegistry, withMosaic(), withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof SpecFileChangelog>;

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
/** This file's directory in the repo, which the glob's keys are relative to. */
const STORY_DIR = 'packages/plugins/plugin-code/src/components/SpecChangelog/';

/** The repo's own sources, keyed by repo path, so hover cards and walkthroughs show real declarations. */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(
      [
        '../../../../plugin-code/dx.config.ts',
        '../../../../plugin-code/src/**/*.{ts,tsx}',
        '../../../../plugin-file-system/dx.config.ts',
        '../../../../plugin-file-system/src/**/*.{ts,tsx}',
      ],
      { query: '?raw', import: 'default', eager: true },
    ),
  ).map(([file, text]) => [new URL(file, `file:///${STORY_DIR}`).pathname.slice(1), text]),
);

const readSource = ({ path }: SourceKey) => SOURCES[path];

const openOnGitHub = ({ owner, repo, path }: SourceKey) =>
  window.open(`https://github.com/${owner}/${repo}/blob/main/${path}`, '_blank', 'noopener');

/** plugin-code's own spec with its review: status and code chips in the margin, code boxes on the graph. */
export const SpecIde: Story = {
  args: {
    content: CODE_SPEC,
    review: CODE_REVIEW,
    onOpenCode: openOnGitHub,
    read: readSource,
    defaultView: 'decisions',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('spec-review.gutter-chip').length).toBeGreaterThan(0), TIMEOUT);
    await waitFor(
      () => expect(canvas.getAllByTestId('spec-editor.implementation-chip').length).toBeGreaterThan(0),
      TIMEOUT,
    );
    // Hovering a code chip shows the file name and the declaration it names, read from the bundled sources.
    const local = canvas
      .getAllByTestId('spec-editor.implementation-chip')
      .find((chip) => chip.dataset.key?.includes('/plugin-code/src/'));
    if (!local) {
      const keys = canvas.getAllByTestId('spec-editor.implementation-chip').map((chip) => chip.dataset.key);
      throw new Error(`No code chip points into plugin-code/src; chips point at: ${keys.join(', ')}`);
    }
    await userEvent.hover(local);
    const card = await waitFor(() => within(canvasElement.ownerDocument.body).getByTestId('spec-review.snippet-card'));
    await waitFor(() => expect(within(card).getByTestId('spec-review.snippet')).toBeTruthy());
    // The card must sit on screen beside its chip, not merely be in the DOM.
    await waitFor(() => {
      const box = card.getBoundingClientRect();
      const chip = local.getBoundingClientRect();
      return expect(box.top >= 0 && (box.top >= chip.bottom || box.bottom <= chip.top)).toBe(true);
    });

    // Keyboard focus opens the same card, and the chip describes it for screen readers.
    await expect(local.getAttribute('aria-description')).toBe(local.dataset.key);
    await userEvent.unhover(local);
    await waitFor(() =>
      expect(within(canvasElement.ownerDocument.body).queryByTestId('spec-review.snippet-card')).toBeNull(),
    );
    local.focus();
    await waitFor(() => within(canvasElement.ownerDocument.body).getByTestId('spec-review.snippet-card'));
    local.blur();

    // The current Review card of an op expands to its walkthrough, each step with its code.
    await userEvent.click(canvas.getByTestId('spec-changelog.view.review'));
    const importSpec = await waitFor(
      () =>
        canvasElement.querySelector<HTMLElement>('[data-testid="verdict-card"][data-verdict="importSpec"]') ??
        undefined,
      TIMEOUT,
    );
    if (!importSpec) {
      throw new Error('The review has no importSpec card.');
    }
    await userEvent.click(importSpec);
    const steps = await waitFor(() => within(importSpec).getAllByTestId('verdict-card.walkthrough-step'), TIMEOUT);
    await waitFor(() => expect(within(importSpec).getAllByTestId('spec-review.snippet')).toHaveLength(steps.length));
  },
};

/** A real spec reviewed against its code by the spec-review skill, opened on the Review view. */
export const FileSystemReview: Story = {
  args: {
    content: FILE_SYSTEM_SPEC,
    review: FILE_SYSTEM_REVIEW,
    onOpenCode: openOnGitHub,
    read: readSource,
    defaultView: 'review',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const review = parseReview(await EffectEx.runPromise(resolveSpecText(FILE_SYSTEM_REVIEW)));
    await waitFor(() => expect(canvas.getAllByTestId('verdict-card').length).toBe(review.verdicts.length), TIMEOUT);
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

/** The ECHO query subsystem: the local engine, remote revalidation and the host index. */
export const EchoQuery: Story = {
  args: { content: ECHO_QUERY_SPEC },
};
