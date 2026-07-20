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

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Text as EchoText, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { ObjectHistory } from '@dxos/plugin-space/containers';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

import { translations } from '#translations';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';

const concat = (...lines: string[]) => lines.join('\n');

/** Minimal plugin that contributes an empty Extensions capability for stories. */
const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.versioningExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => Effect.succeed(Capability.contributes(MarkdownCapabilities.ExtensionProvider, [])),
  }),
  Plugin.make,
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

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = doc ? Obj.getURI(doc) : undefined;
  // Establish the attention scope for `id` so the editor toolbar's attendable-scoped menu actions
  // resolve (a bare Surface has no attended element for the toolbar's `Menu.Root` to bind to).
  const attentionAttrs = useAttentionAttributes(id);
  if (!doc || !id) {
    return <Loading />;
  }

  return (
    <div className='dx-container grid grid-cols-2 divide-x divide-separator'>
      <div className='contents' {...attentionAttrs}>
        <Surface.Surface type={AppSurface.Article} data={{ subject: doc, attendableId: id }} limit={1} />
      </div>
      <ObjectHistory role='article' subject={doc} attendableId={id} />
    </div>
  );
};

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

/** Merge the active branch via the version banner ('Merge' also labels a panel icon button). */
const mergeViaBanner = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const banner = canvas.getByRole('status');
  await userEvent.click(within(banner).getByText('Merge'));
};

const meta = {
  title: 'plugins/plugin-markdown/containers/DocumentVersioning',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<{ content?: string }>((context) => ({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        MarkdownExtensionsPlugin(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              currentDoc = personalSpace.db.add(
                Markdown.make({ name: 'Versioning', content: context.args.content ?? '' }),
              );
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: '# Hello World\n',
  },
};

/**
 * Edit the document, create multiple checkpoints, then time-travel back and forward.
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
 * Case 2 (navigation): revisions ON a branch, then time-travel among them and back to the branch
 * TIP. Reproduces the reported bug: after creating a revision on a branch you must be able to (a)
 * select that revision (it renders the branch's historical content, not empty), and (b) return to
 * the editable branch tip — the timeline's per-branch `Tip` node, not main's `Now`.
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
 * Edit the document, branch it, then make SEVERAL edit→revision cycles ON the branch: each revision
 * is a checkpoint created through the panel while the branch is in view. A branch revision must
 * record the branch's heads and lane on the branch (not the parent) — the bug this guards. Then a
 * concurrent parent edit and a merge: every branch edit plus the parent edit survive the CRDT merge.
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
    await mergeViaBanner(canvasElement);
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
 * Case 3: a CHAIN of branches and merges. Fork a branch off main and merge it; then fork a second
 * branch off the (now-updated) main and merge that too. Each merge folds its branch into main and
 * leaves a `merge:` node, so main accumulates every branch's edits and the timeline records both
 * merges. (True nested branch-of-branch — a branch forked off another branch's tip — is a follow-up;
 * the core branch registry is flat, keyed by the root object. See DESIGN.md.)
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
    await mergeViaBanner(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());
    await waitFor(() => expect(editorContent(canvasElement)).toContain('b'), { timeout: 10_000 });
    await canvas.findByText('merge: first');

    // Second branch forks off the updated main (which now contains the first merge) and merges too.
    await createBranchViaUi(canvasElement, 'second');
    await canvas.findByTestId('version-banner-branch');
    await setBranchContent('second', 'a\nb\nc\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('c'));
    await mergeViaBanner(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());

    // Main accumulates both branches' edits; both merges are recorded in the timeline.
    await waitFor(() => ['a', 'b', 'c'].forEach((line) => expect(editorContent(canvasElement)).toContain(line)));
    await canvas.findByText('merge: first');
    await canvas.findByText('merge: second');
  },
};

/**
 * Case 4 (auto-resolve): concurrent edits to the SAME line on a branch and its parent. Core branches
 * share fork ancestry, so `A.merge` interleaves both sides at character level — both survive with NO
 * conflict markers. This is the default (conflict-free) merge behaviour; the marker path below is
 * only for legacy/external content.
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
    await mergeViaBanner(canvasElement);
    await waitFor(() => expect(canvas.queryByTestId('version-banner-branch')).toBeNull());
    await waitFor(() => expect(editorContent(canvasElement)).toContain('ours'), { timeout: 10_000 });
    await waitFor(() => expect(editorContent(canvasElement)).toContain('theirs'));
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('<<<<<<<'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('bravo'));
  },
};

/**
 * Case 4 (markers): the inline conflict-marker resolution UI. Core branches CRDT-merge without
 * conflicts (see ConflictAutoResolve), so git-style markers arise only from legacy content-copy
 * merges or externally-imported content — seeded directly here. Marker blocks render with inline
 * resolution buttons (and must not be styled as blockquotes).
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
