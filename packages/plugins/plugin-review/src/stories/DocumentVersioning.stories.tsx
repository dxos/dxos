//
// Copyright 2026 DXOS.org
//

//
// Versioning storybook test plan.
//
// Every action runs through the real UI (panel buttons, timeline nodes, banners) rather than the
// data layer, so a passing story means the manual flow works. Document edits are the one exception:
// they are spliced through the automerge binding to simulate the editor's live typing (concurrent
// branch/parent edits must CRDT-merge, which whole-string assignment would not).
//
//   1. main revisions              — TimeTravel: checkpoints on main, travel back/forward, return to Now.
//   2. sub-branch revisions        — BranchRevisions: revisions ON a branch; select one (read-only),
//                                    then return to the branch TIP (editable). BranchMerge: merge back.
//   3. chained branches + merges   — ChainedBranches: fork → merge → fork again → merge (flat registry).
//                                    True nested branch-of-branch is a follow-up (see DESIGN.md).
//   4. merge conflict              — ConflictAutoResolve: concurrent same-line edits CRDT-merge with no
//                                    markers. ConflictResolution: the marker-resolution UI for a
//                                    legacy/external conflict block.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Text as EchoText, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { EditorView } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { ReviewPlugin } from '../plugin';
import {
  type ReviewScenario,
  ReviewStoryLayout,
  type ReviewStoryPanel,
  boldWrapScenario,
  editingScenario,
  modeRoundTripScenario,
  overlapRoundTripScenario,
  seedComments,
  suggestingDeleteScenario,
  suggestingScenario,
  tableCellEditScenario,
  tableSuggestScenario,
} from '../testing';
import { runScenarioStorybook, selectViewMode } from '../testing/scenario-executor-storybook';
import { translations } from '../translations';

const concat = (...lines: string[]) => lines.join('\n');

/** The phrase the story's seeded comment thread is anchored to; must appear in the story document. */
const COMMENT_ANCHOR = 'Reviewers can work through the changes';

/** Minimal plugin that contributes an empty Extensions capability for stories. */
const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.versioningExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () => Effect.succeed([Capability.contribute(MarkdownCapabilities.ExtensionProvider, [])]),
  }),
  Plugin.make,
);

//
// Ambient review (A5) story fixtures: a comment-seeding extension exercises the ambient overlay +
// comment coexistence; suggestion sources resolve through the real in-package provider.
//

/** Contributes the Suggesting view-mode entry; gated to the review stories via the `ambientReview` param. */
const AmbientReviewPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.ambientReview'),
    name: 'Story Ambient Review',
  }),
).pipe(
  Plugin.addModule({
    id: 'ambient-review',
    provides: [MarkdownCapabilities.ViewModeExtension],
    activate: () =>
      Effect.succeed([
        // Stand in for the plugin's own contribution so the Suggesting view-mode entry appears.
        Capability.contribute(MarkdownCapabilities.ViewModeExtension, {
          id: 'suggesting',
          icon: 'ph--note-pencil--regular',
          label: 'Suggesting',
          reviewMode: 'suggesting',
          order: 3,
        }),
      ]),
  }),
  Plugin.make,
);

const PROSE = concat(
  '# Release notes',
  '',
  'The editor now tracks suggestions from every collaborator at once. Each proposal is diffed against',
  'the revision it was written on, so two people can suggest changes to the same paragraph without',
  'either one appearing to delete the other.',
  '',
  'Reviewers can work through the changes in any order:',
  '',
  '- Accept folds a change into the document.',
  '- Reject drops it and leaves the text untouched.',
  '- Comments stay anchored to their range either way.',
  '',
  'The last paragraph exists so there is something to delete at the end of the document.',
  '',
);

const PROSE_SUGGESTION_BOB = concat(
  '# Release notes',
  '',
  'The editor now tracks suggestions from every collaborator at once. Each proposal is diffed against',
  'the revision it was written on, so two people can suggest changes to the same paragraph without',
  'either one appearing to delete the other.',
  '',
  'Reviewers can work through the changes in any order:',
  '',
  '- Accept folds a change into the document.',
  '- Reject drops it and leaves the text untouched.',
  '- Comments stay anchored to their range either way.',
  '- Bob: add an example of a conflicting edit.',
  '',
  'The last paragraph exists so there is something to delete at the end of the document.',
  '',
  'Bob also proposes this closing line, so a suggestion sits at the very end of the document.',
  '',
);

const PROSE_SUGGESTION_ALICE = concat(
  '# Release notes',
  '',
  'The editor now tracks suggestions from every collaborator at once, which is the point of the whole',
  'exercise. Each proposal is diffed against',
  'the revision it was written on, so two people can suggest changes to the same paragraph without',
  'either one appearing to delete the other.',
  '',
  'Reviewers can work through the changes in any order:',
  '',
  '- Accept folds a change into the document.',
  '- Reject drops it and leaves the text untouched.',
  '- Comments stay anchored to their range either way.',
  '',
  'The last paragraph exists so there is something to delete at the end of the document.',
  '',
);

// Play functions drive document edits through the data layer (exercising the editor's live
// automerge binding) and all versioning actions through the UI. Captured per story run.
let currentDoc: Markdown.Document | undefined;

const getDoc = (): Markdown.Document => {
  invariant(currentDoc, 'story document not initialized');
  return currentDoc;
};

// Splice-based edits (as the editor produces) so concurrent branch/parent changes CRDT-merge;
// whole-string assignment would be a scalar PUT that merges last-writer-wins.
const setRootContent = (content: string) => {
  const root = getDoc().content.target;
  invariant(root, 'root text not loaded');
  Obj.update(root, () => {
    EchoText.update(root, 'content', content);
  });
};

const setBranchContent = async (branchName: string, content: string) => {
  const doc = getDoc();
  const branch = doc.history?.branches.find((branch) => branch.name === branchName);
  invariant(branch, 'branch not found');
  const binding = await Branch.bind(doc, branch);
  Obj.update(binding.object, () => {
    EchoText.update(binding.object, 'content', content);
  });
  binding.dispose();
};

const editorContent = (canvasElement: HTMLElement): string => {
  const content = canvasElement.querySelector('.cm-content');
  return content?.textContent ?? '';
};

/** A foreign author's proposed rewrite of the whole document, seeded as a suggestion branch. */
type SuggestionSpec = { creator: string; content: string };

// Find-or-create a per-author suggestion branch and set its content (splice, as the editor would),
// so the ambient overlay diffs it against main into an attributable suggestion.
const seedSuggestion = async (creator: string, content: string) => {
  const doc = getDoc();
  // Seeding runs both from plays (root already resolved) and from the decorator right after the doc
  // is created, where the ref still needs loading.
  const parent = doc.content.target ?? (await doc.content.load());
  invariant(parent, 'root text not loaded');
  const branch = await Branch.suggestion(doc, parent, creator);
  const binding = await Branch.bind(doc, branch);
  Obj.update(binding.object, () => {
    EchoText.update(binding.object, 'content', content);
  });
  binding.dispose();
};

/** Story args: what the decorator seeds before mount, plus which companions the layout shows. */
type StoryArgs = {
  content?: string;
  suggestions?: SuggestionSpec[];
  panels?: ReviewStoryPanel[];
};

const DefaultStory = ({ panels }: StoryArgs) => <ReviewStoryLayout panels={panels} />;

// The name popover portals to document.body, outside the story canvas.
const createRevisionViaUi = async (canvasElement: HTMLElement, name = '') => {
  const canvas = within(canvasElement);
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(await canvas.findByText('Create revision', undefined, { timeout: 15_000 }));
  const input = await body.findByPlaceholderText('Revision name (optional)');
  if (name) {
    await userEvent.type(input, name);
  }

  await userEvent.click(body.getByText('Create'));
  if (name) {
    // The new revision appears in the timeline.
    await canvas.findByText(name);
  }
};

const createBranchViaUi = async (canvasElement: HTMLElement, name: string) => {
  const canvas = within(canvasElement);
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(await canvas.findByText('New branch', undefined, { timeout: 15_000 }));
  const input = await body.findByPlaceholderText('Branch name…');
  await userEvent.type(input, name);
  await userEvent.click(body.getByText('Create'));
};

/** Click a timeline node (checkpoint, fork, branch tip, or `Now`) by its label. */
const selectTimelineNode = async (canvasElement: HTMLElement, label: string) => {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByText(label, undefined, { timeout: 15_000 }));
};

/** Merge the active branch via the history panel's Merge button (the banner no longer merges). */
const mergeViaPanel = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: 'Merge' }));
};

const meta = {
  title: 'plugins/plugin-review/stories/DocumentVersioning',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>((context) => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        MarkdownExtensionsPlugin(),
        // Ambient-review fixtures only for the AmbientReview story (keeps other stories untouched).
        ...(context.parameters?.ambientReview ? [AmbientReviewPlugin()] : []),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client, { displayName: 'Alice Mercer' });
              currentDoc = personalSpace.db.add(
                Markdown.make({ name: 'Versioning', content: context.args.content ?? '' }),
              );
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));

              // Seeded before mount so a manual story opens already reviewable — the same state the
              // play-driven stories build up step by step, without a play mutating it first.
              for (const { creator, content } of context.args.suggestions ?? []) {
                yield* Effect.promise(() => seedSuggestion(creator, content));
              }
              if (context.parameters?.ambientReview) {
                const text = yield* Effect.promise(() => currentDoc!.content.load());
                seedComments(personalSpace, currentDoc!, text, [COMMENT_ANCHOR]);
              }
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        ReviewPlugin(),
        MarkdownPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...markdownTranslations, ...spaceTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Baseline:
 * - Plain document on main, no branches or checkpoints.
 * - The versioning affordances are present but inactive.
 *
 * Test:
 * 1. Plain doc on main: no banner, no review chrome (default binding).
 * 2. Type text: edits land live; caret/scroll stable.
 */
export const Default: Story = {
  args: {
    content: '# Hello World\n',
  },
};

//
// Manual walkthroughs. Setup is declared in `args` (suggestions are seeded before mount) and there
// is deliberately no play function — a play would leave the story in a post-assertion state, so the
// numbered scripts below would start from something other than what they describe.
//

/**
 * Manual: another author's suggestion overlaid on main.
 *
 * Test:
 * 1. Bob's change overlays inline in his colour with a gutter bar; the seeded comment highlight coexists.
 * 2. Hover the overlaid change: Accept/Reject popover appears, unclipped.
 * 3. Accept: change folds into main, overlay clears. (Reload the story) Reject: overlay clears, main unchanged.
 * 4. Click the comment highlight under the overlay: comment activates (overlay must not eat the click).
 */
export const AmbientReview: Story = {
  args: {
    content: PROSE,
    suggestions: [
      { creator: 'did:alice', content: PROSE_SUGGESTION_ALICE },
      { creator: 'did:bob', content: PROSE_SUGGESTION_BOB },
    ],
  },
  parameters: {
    ambientReview: true,
  },
};

/**
 * Manual: your own suggestions, written to your suggestion branch.
 *
 * Test:
 * 1. Switch the view-mode dropdown to Suggesting: the editor rebinds to your branch; Bob still overlays.
 * 2. Insert a sentence mid-paragraph: renders in your colour, underlined; change-bar in gutter.
 * 3. Delete a few words: strikethrough phantom; hover -> restore returns them.
 * 4. Delete a whole line/list item: phantom preserves the line break (block deletion).
 * 5. Mode-switch matrix: Suggesting -> Source -> Preview -> Read-only -> Suggesting; edit hidden in Preview/Read-only, visible in Source/Suggesting, always recoverable (see TEST-PLAN section 0).
 * 6. Timeline: your suggestion branch and Bob's each lane in author colour.
 */
export const Suggesting: Story = {
  args: {
    content: PROSE,
    suggestions: [{ creator: 'did:bob', content: PROSE_SUGGESTION_BOB }],
  },
  parameters: {
    ambientReview: true,
  },
};

/**
 * Manual: ordinary typing on the ambient path (Editing mode, bound to main).
 *
 * Test:
 * 1. Type steadily at the caret: no remount, no caret jump, no dropped keys.
 * 2. Toggle view modes between bursts: content stable, no suggestion branch created for your keystrokes.
 * 3. Bob's overlay stays anchored to main and never strikes the text you just typed.
 */
export const EditingTyping: Story = {
  args: {
    content: PROSE,
    suggestions: [{ creator: 'did:bob', content: PROSE_SUGGESTION_BOB }],
  },
  parameters: {
    ambientReview: true,
  },
};

/**
 * Time travel across checkpoints:
 * - Edits the doc and creates three named revisions (v1–v3) via the panel.
 * - Selecting each revision renders its pinned content read-only.
 * - "Now" returns to the editable tip and clears the checkpoint banner.
 */
export const TimeTravel: Story = {
  args: {
    content: concat('1'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for initial content then create revision 1.
    await waitFor(() => expect(editorContent(canvasElement)).toContain('1'), { timeout: 20_000 });
    await createRevisionViaUi(canvasElement, 'v1');

    // Edit + revision 2.
    setRootContent('1 2');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('1 2'));
    await createRevisionViaUi(canvasElement, 'v2');

    // Edit + revision 3.
    setRootContent('1 2 3');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('1 2 3'));
    await createRevisionViaUi(canvasElement, 'v3');

    // Travel back to v1 (readonly).
    // TODO(burdon): Check readonly.
    await userEvent.click(canvas.getByText('v1'));
    await canvas.findByTestId('version-banner-checkpoint');
    await waitFor(() => expect(editorContent(canvasElement)).toBe('1'));

    // Forward to v2 (readonly).
    await userEvent.click(canvas.getByText('v2'));
    await waitFor(() => expect(editorContent(canvasElement)).toBe('1 2'));

    // Forward to v3 (readonly).
    await userEvent.click(canvas.getByText('v3'));
    await waitFor(() => expect(editorContent(canvasElement)).toBe('1 2 3'));

    // Back to the present: banner gone, tip content restored (editable).
    await userEvent.click(canvas.getByText('Now'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('1 2 3'));
    await waitFor(() => expect(canvas.queryByTestId('version-banner-checkpoint')).toBeNull());
  },
};

/**
 * Revisions on a branch, then navigation (reported-bug regression):
 * - Forks a `draft` branch; "New branch" is disabled while on a branch (no sub-branching).
 * - Two edit→revision cycles checkpoint the branch's own heads/lane.
 * - Selecting a branch revision renders that historical branch content (not empty, not the parent).
 * - The per-branch `Tip` node returns to the editable branch tip.
 * - Clicking a branch revision highlights THAT revision, not the main-lane fork node.
 */
export const BranchRevisions: Story = {
  args: {
    content: 'alpha\nbravo\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha'), { timeout: 20_000 });

    // Fork a branch through the panel; the editor switches to it.
    await createBranchViaUi(canvasElement, 'draft');
    await canvas.findByTestId('version-banner-branch');

    // Sub-branching is unsupported (flat core registry): the New branch button is disabled while on a
    // branch, so a fork cannot silently derive from main instead of the branch.
    await waitFor(() => expect(canvas.getByRole('button', { name: 'New branch' })).toBeDisabled());

    // Two edit→revision cycles ON the branch (each checkpoints the branch's heads, laned on the branch).
    await setBranchContent('draft', 'alpha\nbravo\ncharlie\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));
    await createRevisionViaUi(canvasElement, 'draft-r1');

    await setBranchContent('draft', 'alpha\nbravo\ncharlie\ndelta\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('delta'));
    await createRevisionViaUi(canvasElement, 'draft-r2');

    // Select the FIRST branch revision: the editor shows that historical branch content (read-only),
    // not empty and not the parent — the binding must resolve before the editor mounts.
    await selectTimelineNode(canvasElement, 'draft-r1');
    await canvas.findByTestId('version-banner-checkpoint');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('delta'));
    // Still no sub-branching from a branch revision (would fork from main).
    await expect(canvas.getByRole('button', { name: 'New branch' })).toBeDisabled();

    // Return to the branch TIP via the per-branch tip node: editable again, latest branch content.
    await selectTimelineNode(canvasElement, 'Tip');
    await canvas.findByTestId('version-banner-branch');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('delta'));
    await waitFor(() => expect(canvas.queryByTestId('version-banner-checkpoint')).toBeNull());

    // Regression: from the branch tip, clicking a branch revision must highlight THAT revision — not
    // snap the highlight to the main-lane 'fork: draft' checkpoint (the timeline was jumping to the
    // first commit of the highlighted lane on every selection change).
    await selectTimelineNode(canvasElement, 'draft-r2');
    await canvas.findByTestId('version-banner-checkpoint');
    // The label also appears in the checkpoint banner, so pick the timeline row (an aria-current ancestor).
    const currentRow = (label: string) =>
      canvas
        .getAllByText(label)
        .map((element) => element.closest('[aria-current]'))
        .find((element): element is Element => element !== null);
    await waitFor(() => expect(currentRow('draft-r2')?.getAttribute('aria-current')).toBe('true'));
    await expect(currentRow('fork: draft')?.getAttribute('aria-current')).toBe('false');
  },
};

/**
 * Branch revisions + CRDT merge:
 * - Forks `draft`; three edit→revision cycles, each checkpointing the branch (heads/lane on the branch).
 * - A concurrent parent edit stays isolated from the branch view.
 * - Merge folds every branch edit AND the parent edit onto main; the editor returns to main.
 * - A `merge: draft` node appears; post-merge revisions resolve read-only against the root doc.
 */
export const BranchMerge: Story = {
  args: {
    content: 'alpha\nbravo\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha'), { timeout: 20_000 });

    // Create a branch through the panel; the editor switches to it.
    await createBranchViaUi(canvasElement, 'draft');
    await canvas.findByTestId('version-banner-branch');

    // Edit → create a named revision, repeated. Each revision is created via the panel while the
    // branch is selected, so it checkpoints the BRANCH (records the branch's heads, tagged with the
    // branch key) and appears on the branch lane. A later edit only builds on the earlier ones if
    // the branch document truly accumulates them.
    await setBranchContent('draft', 'alpha\nbravo\ncharlie\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));
    await createRevisionViaUi(canvasElement, 'draft-r1');

    await setBranchContent('draft', 'alpha\nbravo\ncharlie\ndelta\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('delta'));
    await createRevisionViaUi(canvasElement, 'draft-r2');

    await setBranchContent('draft', 'alpha\nbravo\ncharlie\ndelta\nepsilon\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('epsilon'));
    await createRevisionViaUi(canvasElement, 'draft-r3');

    // Both named branch revisions are listed in the timeline, and the editor still shows the branch
    // tip (creating a revision does not change the selection away from the branch).
    await canvas.findByText('draft-r1');
    await canvas.findByText('draft-r2');
    await canvas.findByText('draft-r3');
    await canvas.findByTestId('version-banner-branch');
    await waitFor(() =>
      ['charlie', 'delta', 'epsilon'].forEach((line) => expect(editorContent(canvasElement)).toContain(line)),
    );

    // Concurrent edit on the parent, isolated from the branch view (main's first line only).
    setRootContent('alpha edited\nbravo\n');
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('alpha edited'));

    // Merge via the banner; the concurrent parent edit AND every branch edit land on main, and the
    // editor returns to it.
    await mergeViaPanel(canvasElement);
    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha edited'), { timeout: 10_000 });
    await waitFor(() =>
      ['charlie', 'delta', 'epsilon'].forEach((line) => expect(editorContent(canvasElement)).toContain(line)),
    );
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());

    // The merge auto-checkpoint appears in the timeline.
    await canvas.findByText('merge: draft');

    // Regression: after merge the branch registry entry is gone, but its revisions stay in the
    // timeline. Selecting one must NOT try to bind the deleted branch (it threw "branch not found").
    // The merge folded the branch history into main, so the revision resolves against the root doc,
    // read-only: 'draft-r1' predates the later branch edits and the concurrent parent edit.
    await selectTimelineNode(canvasElement, 'draft-r1');
    await canvas.findByTestId('version-banner-checkpoint');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('epsilon'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('alpha edited'));
  },
};

/**
 * Chained fork→merge sequences:
 * - Forks `first` off main, edits, merges back (leaves a `merge: first` node).
 * - Forks `second` off the now-updated main, edits, merges back.
 * - Main accumulates both branches' edits; both merges are recorded in the timeline.
 * - True nested branch-of-branch is a follow-up — the core registry is flat, keyed by the root. See DESIGN.md.
 */
export const ChainedBranches: Story = {
  args: {
    content: 'a\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(editorContent(canvasElement)).toContain('a'), { timeout: 20_000 });

    // First branch: add a line, merge back to main.
    await createBranchViaUi(canvasElement, 'first');
    await canvas.findByTestId('version-banner-branch');
    await setBranchContent('first', 'a\nb\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('b'));
    await mergeViaPanel(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());
    await waitFor(() => expect(editorContent(canvasElement)).toContain('b'), { timeout: 10_000 });
    await canvas.findByText('merge: first');

    // Second branch forks off the updated main (which now contains the first merge) and merges too.
    await createBranchViaUi(canvasElement, 'second');
    await canvas.findByTestId('version-banner-branch');
    await setBranchContent('second', 'a\nb\nc\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('c'));
    await mergeViaPanel(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());

    // Main accumulates both branches' edits; both merges are recorded in the timeline.
    await waitFor(() => ['a', 'b', 'c'].forEach((line) => expect(editorContent(canvasElement)).toContain(line)));
    await canvas.findByText('merge: first');
    await canvas.findByText('merge: second');
  },
};

/**
 * Conflict-free merge (default):
 * - Branch and parent edit the SAME line concurrently.
 * - Core branches share fork ancestry, so `A.merge` interleaves both sides at character level.
 * - Both edits survive with NO conflict markers.
 */
export const ConflictAutoResolve: Story = {
  args: {
    content: 'alpha\nbravo\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha'), { timeout: 20_000 });

    await createBranchViaUi(canvasElement, 'draft');
    await canvas.findByTestId('version-banner-branch');

    // Branch edits the first line; parent edits the SAME line concurrently (isolated from the view).
    await setBranchContent('draft', 'alpha theirs\nbravo\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('theirs'));
    setRootContent('alpha ours\nbravo\n');

    // Merge: both edits interleave via the CRDT — no markers, both words present.
    await mergeViaPanel(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());
    await waitFor(() => expect(editorContent(canvasElement)).toContain('ours'), { timeout: 10_000 });
    await waitFor(() => expect(editorContent(canvasElement)).toContain('theirs'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('<<<<<<<'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('bravo'));
  },
};

/**
 * Inline conflict-marker resolution (legacy/imported content only):
 * - Seeds a git-style conflict block, as a legacy textual merge or an external import would.
 * - The block renders with markers + both sides, and is NOT styled as a blockquote.
 * - "Accept branch" resolves it: the branch side wins and the markers disappear.
 * - (Core branches CRDT-merge without markers — see ConflictAutoResolve.)
 */
export const ConflictResolution: Story = {
  args: {
    content: 'alpha\nbravo\n',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha'), { timeout: 20_000 });

    // Seed a git-style conflict block (as a legacy textual merge or an external import would).
    setRootContent('<<<<<<< branch\nalpha theirs\n=======\nalpha ours\n>>>>>>> current\nbravo\n');

    // The conflict block renders with markers and both sides.
    await waitFor(() => expect(editorContent(canvasElement)).toContain('<<<<<<< branch'), { timeout: 10_000 });
    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha theirs'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha ours'));

    // Merge markers are not decorated as blockquotes (only a single '>' denotes a quote).
    await expect(canvasElement.querySelector('.cm-blockquote')).toBeNull();

    // Resolve via the inline button: the branch side wins and the markers disappear.
    await userEvent.click(await canvas.findByText('Accept branch'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('<<<<<<<'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha theirs'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('alpha ours'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('bravo'));
  },
};

/** Concatenated text of the inline suggestion inserts currently overlaid in the editor. */
const suggestInserts = (canvasElement: HTMLElement): string =>
  Array.from(canvasElement.querySelectorAll('.cm-suggest-insert'))
    .map((node) => node.textContent ?? '')
    .join(' ');

/** Concatenated text of the foreign-overlay strikethroughs currently rendered in the editor. */
const suggestDeletes = (canvasElement: HTMLElement): string =>
  Array.from(canvasElement.querySelectorAll('.cm-suggest-delete'))
    .map((node) => node.textContent ?? '')
    .join(' ');

/** Concatenated text of the self tracked-change insertions (Suggesting mode) rendered in the editor. */
const trackInserts = (canvasElement: HTMLElement): string =>
  Array.from(canvasElement.querySelectorAll('.cm-track-insert'))
    .map((node) => node.textContent ?? '')
    .join('');

/** The live root (main) content. */
const rootContent = (): string => {
  const root = getDoc().content.target;
  invariant(root, 'root text not loaded');
  return root.content;
};

// Read a suggestion branch's live content by binding it (as a second surface would); `excludeCreator`
// skips a seeded foreign author so this resolves the current user's own suggestion branch.
const suggestionBranchContent = async (excludeCreator: string): Promise<string> => {
  const doc = getDoc();
  const branch = doc.history?.branches.find(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion' && branch.creator !== excludeCreator,
  );
  invariant(branch, 'suggestion branch not found');
  const binding = await Branch.bind(doc, branch);
  try {
    return binding.object.content;
  } finally {
    binding.dispose();
  }
};

// Read the editor's read-only state directly from the CodeMirror view (the review policy drives
// `EditorState.readOnly`); `contenteditable` is unaffected by `readOnly`, so it cannot be asserted.
const editorReadOnly = (canvasElement: HTMLElement): boolean | undefined => {
  const dom = canvasElement.querySelector<HTMLElement>('.cm-content');
  const view = dom ? EditorView.findFromDOM(dom) : null;
  return view?.state.readOnly;
};

/**
 * Ambient review (Milestone A) — the default view, governed by the per-user review mode:
 * - Stays on main and overlays EVERY author's suggestions plus comments (no branch selection).
 * - Editing: both authors' suggestions overlay inline and the comment highlight shows; editor editable.
 * - Viewing: suggestions hide, the comment stays, the editor goes read-only.
 * - Suggestion sources + comments are stood in by story-local `@dxos/ui-editor` fixtures
 *   (plugin-markdown cannot depend on plugin-review).
 */
export const AmbientReviewTest: Story = {
  args: {
    content: '# Hello World\n',
  },
  // Excluded from the headless CI runner (`tags: ['!test']`): asserts live suggestion/comment overlay
  // settling that the headless plugin host cannot reach within the timeout; run manually in storybook.
  tags: ['!test'],
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    // Wait for the editor and the seeded comment highlight (mode defaults to editing).
    await waitFor(() => expect(editorContent(canvasElement)).toContain('Hello World'), { timeout: 20_000 });
    await waitFor(() => expect(canvasElement.querySelector('.cm-comment')).not.toBeNull(), { timeout: 15_000 });

    // Seed two authors' suggestion branches on main; each appends a distinct line.
    await seedSuggestion('did:alice', '# Hello World\n\nAlice: nice intro.\n');
    await seedSuggestion('did:bob', '# Hello World\n\nBob: add an example.\n');

    // Editing mode: both authors' suggestions overlay the editor AND the comment highlight remains.
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Alice'), { timeout: 15_000 });
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'));
    await expect(canvasElement.querySelector('.cm-comment')).not.toBeNull();
    // Editor is editable in the ambient editing mode.
    await waitFor(() => expect(editorReadOnly(canvasElement)).toBe(false));

    // Switch to Viewing via the toolbar: suggestions disappear, the comment remains, editor read-only.
    await selectViewMode(canvasElement, 'Read-only');
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-suggest-insert')).toHaveLength(0), {
      timeout: 15_000,
    });
    await waitFor(() => expect(canvasElement.querySelector('.cm-comment')).not.toBeNull(), { timeout: 15_000 });
    await waitFor(() => expect(editorReadOnly(canvasElement)).toBe(true), { timeout: 15_000 });

    // Switch back to Editing so the toggle round-trips AND the story rests showing the suggestions
    // (Viewing intentionally hides them, which reads as an empty demo at rest).
    await selectViewMode(canvasElement, 'Source');
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Alice'), { timeout: 15_000 });
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'));
    await waitFor(() => expect(editorReadOnly(canvasElement)).toBe(false));
  },
};

/**
 * Suggesting mode (Milestone B) — the current user authors on their OWN suggestion branch:
 * - Switching to Suggesting binds the editor to the user's `kind:'suggestion'` branch (find-or-create),
 *   so typed edits accrue there rather than mutating main.
 * - The user's typing renders as a self tracked-change (`.cm-track-insert`), NOT a foreign overlay.
 * - The edit lands on the user's branch (asserted via the branch content) and main stays unchanged.
 * - A second author (seeded) still overlays vs main and does NOT strike the user's new text.
 */
/**
 * Regression: in the default **Editing** mode (not Suggesting) ordinary typing must write to main and
 * must NOT create a suggestion branch. Guards the reported "each keypress creates a new suggestion" bug.
 */
export const EditingTypingTest: Story = {
  args: {
    content: '# Hello World\n\nBody paragraph.\n',
  },
  // Excluded from the headless CI runner (`tags: ['!test']`): the regression needs real keystrokes into
  // the editor, and headless `userEvent` typing does not produce CodeMirror document changes. Run
  // manually in storybook to guard the "each keypress creates a suggestion" bug.
  tags: ['!test'],
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(editorContent(canvasElement)).toContain('Body paragraph'), { timeout: 20_000 });

    // Type at the end of the body paragraph — default mode is Editing, editor bound to main. Position
    // the caret at the document end via the CodeMirror view (the `{Control>}{End}` combo is not
    // implemented by the headless userEvent), then type real keystrokes so the edit path is exercised.
    const content = canvasElement.querySelector<HTMLElement>('.cm-content');
    invariant(content, 'editor content not mounted');
    const view = EditorView.findFromDOM(content);
    invariant(view, 'editor view not found');
    view.focus();
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    await userEvent.keyboard(' edited');

    // Wait for the editor + version state to settle, then assert: the edit landed on MAIN (root); no
    // suggestion branch was spawned (per keypress or otherwise); nothing renders as a tracked change.
    await waitFor(
      async () => {
        await expect(rootContent()).toContain('edited');
        // Require history to be initialized — otherwise a not-yet-loaded `history` would collapse to an
        // empty branch list and pass before the regression scenario has settled.
        const history = getDoc().history;
        invariant(history, 'history not initialized');
        const suggestionBranches = history.branches.filter(
          (branch) => branch.status === 'active' && branch.kind === 'suggestion',
        );
        await expect(suggestionBranches).toHaveLength(0);
        await expect(canvasElement.querySelectorAll('.cm-track-insert')).toHaveLength(0);
      },
      { timeout: 15_000 },
    );
  },
};

export const SuggestingTest: Story = {
  args: {
    content: '# Hello World\n',
  },
  // Excluded from the headless CI runner (`tags: ['!test']`): needs real keystrokes into the editor
  // (headless `userEvent` typing does not produce CodeMirror document changes); run manually in storybook.
  tags: ['!test'],
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    // Wait for the editor (mode defaults to editing, editor bound to main).
    await waitFor(() => expect(editorContent(canvasElement)).toContain('Hello World'), { timeout: 20_000 });

    // Seed a second author's suggestion branch on main (a pure append Bob proposes).
    await seedSuggestion('did:bob', '# Hello World\n\nBob: add an example.\n');
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 15_000 });

    // Switch to Suggesting: the editor rebinds to the user's own suggestion branch (starts == main).
    await selectViewMode(canvasElement, 'Suggesting');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('Hello World'), { timeout: 15_000 });
    // Bob still overlays (diffed vs main, rebased into the user's branch coordinates).
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 15_000 });

    // Type into the editor: the caret lands in the branch document; the keystrokes accrue there.
    const content = canvasElement.querySelector<HTMLElement>('.cm-content');
    invariant(content, 'editor content not mounted');
    content.focus();
    await userEvent.keyboard('really ');

    // (a) The typed text renders as the user's own tracked change (self), not a foreign overlay.
    await waitFor(() => expect(trackInserts(canvasElement)).toContain('really'), { timeout: 15_000 });

    // (b) The edit landed on the user's suggestion branch — main (root) is unchanged, the branch has it.
    await waitFor(() => expect(rootContent()).not.toContain('really'));
    await waitFor(async () => expect(await suggestionBranchContent('did:bob')).toContain('really'), {
      timeout: 15_000,
    });

    // (c) Bob still renders vs main and does NOT strike (or claim) the user's new text.
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'));
    await expect(suggestInserts(canvasElement)).not.toContain('really');
    await expect(suggestDeletes(canvasElement)).not.toContain('really');
  },
};

/**
 * Review chrome on the ambient path, with the suggestion seeded before mount (no play setup):
 * - A suggestion anchored at the end of the document leaves an empty line below it, so the caret can
 *   still reach the end (the widget renders at `doc.length` and would otherwise be the last line).
 * - Switching to the "Markdown" view mode keeps the suggestions overlaid and the editor editable —
 *   only "Read only" is a viewing posture, and treating preview as viewing hid every suggestion.
 */
export const ReviewChromeTest: Story = {
  args: {
    content: concat('# Hello World', ''),
    suggestions: [{ creator: 'did:bob', content: concat('# Hello World', '', 'Bob: add an example.', '') }],
  },
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    const lines = () => Array.from(canvasElement.querySelectorAll('.cm-line'));
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 20_000 });

    // A suggestion at the very end anchors before the document's final position, so the caret still
    // has somewhere to land past it (with `side: 1` the widget owned the end and trapped the caret).
    await waitFor(
      async () => {
        const last = lines().at(-1);
        invariant(last, 'no editor lines');
        const widget = last.querySelector('.cm-suggest-actions');
        await expect(widget === null || widget !== last.lastElementChild).toBe(true);
      },
      { timeout: 15_000 },
    );

    // Preview ("Markdown") is an editing posture: suggestions stay and the editor stays editable.
    await selectViewMode(canvasElement, 'Markdown');
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 15_000 });
    await expect(canvasElement.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');
  },
};

/**
 * The same-view invariant (DESIGN.md §3.3): ambient mode switches never tear down the editor. The
 * CodeMirror view — and its DOM — must persist across entering and leaving Suggesting, with caret and
 * focus surviving and edits landing on the right document.
 */
export const SuggestingSwapTest: Story = {
  args: {
    content: PROSE,
    suggestions: [{ creator: 'did:bob', content: PROSE_SUGGESTION_BOB }],
  },
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 20_000 });
    const contentEl = () => canvasElement.querySelector<HTMLElement>('.cm-content');
    const before = contentEl();
    invariant(before, 'editor not mounted');
    const view = EditorView.findFromDOM(before);
    invariant(view, 'view not found');

    // Park the caret mid-paragraph and enter Suggesting.
    view.focus();
    const anchor = view.state.doc.toString().indexOf('any order');
    view.dispatch({ selection: { anchor } });
    await selectViewMode(canvasElement, 'Suggesting');
    await waitFor(() => expect(contentEl()?.getAttribute('contenteditable')).toBe('true'), { timeout: 15_000 });

    // Same view, same DOM — no teardown; caret survived the swap.
    await expect(contentEl()).toBe(before);
    await expect(EditorView.findFromDOM(before)).toBe(view);
    await expect(view.state.selection.main.anchor).toBe(anchor);

    // Type: the edit lands on the BRANCH (as the user's tracked change), never on main.
    view.dispatch({
      changes: { from: anchor, insert: 'SWAP' },
      selection: { anchor: anchor + 'SWAP'.length },
      userEvent: 'input.type',
    });
    await waitFor(() => expect(trackInserts(canvasElement)).toContain('SWAP'), { timeout: 15_000 });
    await expect(rootContent()).not.toContain('SWAP');

    // Leave Suggesting: still the same view and DOM.
    await selectViewMode(canvasElement, 'Markdown');
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('SWAP'), { timeout: 15_000 });
    await expect(contentEl()).toBe(before);
    await expect(EditorView.findFromDOM(before)).toBe(view);
  },
};

//
// Shared-scenario plays: each runs a `testing/scenarios.ts` definition through the full plugin
// stack. The SAME definitions run headless in `testing/scenarios.test.tsx`, so the tiers cannot
// drift — a new step kind fails both executors at compile time until each interprets it.
//

const scenarioArgs = (scenario: ReviewScenario): StoryArgs => ({
  content: scenario.setup.content,
  suggestions: scenario.setup.suggestions,
});

export const ScenarioEditingTest: Story = {
  args: scenarioArgs(editingScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(editingScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioSuggestingTest: Story = {
  args: scenarioArgs(suggestingScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(suggestingScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioSuggestingDeleteTest: Story = {
  args: scenarioArgs(suggestingDeleteScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(suggestingDeleteScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioModeRoundTripTest: Story = {
  args: scenarioArgs(modeRoundTripScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(modeRoundTripScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioOverlapRoundTripTest: Story = {
  args: scenarioArgs(overlapRoundTripScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(overlapRoundTripScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioBoldWrapTest: Story = {
  args: scenarioArgs(boldWrapScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(boldWrapScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioTableSuggestTest: Story = {
  args: scenarioArgs(tableSuggestScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(tableSuggestScenario, { canvasElement, doc: getDoc }),
};

export const ScenarioTableCellEditTest: Story = {
  args: scenarioArgs(tableCellEditScenario),
  parameters: { ambientReview: true },
  play: ({ canvasElement }) => runScenarioStorybook(tableCellEditScenario, { canvasElement, doc: getDoc }),
};

/**
 * Per-author suggestion visibility (F2.7): toggling an author off in the companion removes their
 * overlay decorations and cards for this user only; toggling back restores them. Other authors are
 * unaffected throughout, and the branches themselves are untouched.
 */
export const AuthorVisibilityTest: Story = {
  args: {
    content: PROSE,
    suggestions: [
      { creator: 'did:alice', content: PROSE_SUGGESTION_ALICE },
      { creator: 'did:bob', content: PROSE_SUGGESTION_BOB },
    ],
  },
  parameters: {
    ambientReview: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Both authors overlay in the editor and the companion lists both cards.
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 20_000 });
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('the point of the whole'));
    // A suggestion card is a thread message tile carrying the Accept control (comment tiles don't).
    const suggestionCards = () =>
      Array.from(canvasElement.querySelectorAll('[data-testid="thread.message"]'))
        .filter((tile) => tile.querySelector('[data-testid="thread.message.accept-change"]'))
        .map((tile) => tile.textContent ?? '')
        .join(' ');
    await waitFor(() => expect(suggestionCards()).toContain('Bob'), { timeout: 15_000 });

    // Toggle Bob off: his overlay and cards disappear; Alice is untouched; his branch survives.
    const bobToggle = async () => {
      const toggles = await canvas.findAllByTestId('suggestion-author-toggle');
      const found = toggles.find((toggle) => toggle.textContent?.includes('did:bob'));
      invariant(found, 'Bob toggle not found');
      return found;
    };
    await userEvent.click(await bobToggle());
    await waitFor(() => expect(suggestInserts(canvasElement)).not.toContain('Bob'), { timeout: 15_000 });
    await expect(suggestInserts(canvasElement)).toContain('the point of the whole');
    await waitFor(() => expect(suggestionCards()).not.toContain('Bob'));
    await expect(suggestionCards()).toContain('point of the whole');
    await expect(
      getDoc().history?.branches.some(
        (branch) => branch.status === 'active' && branch.kind === 'suggestion' && branch.creator === 'did:bob',
      ),
    ).toBe(true);

    // Toggle Bob back on: overlay and cards return.
    await userEvent.click(await bobToggle());
    await waitFor(() => expect(suggestInserts(canvasElement)).toContain('Bob'), { timeout: 15_000 });
    await waitFor(() => expect(suggestionCards()).toContain('Bob'));
  },
};
