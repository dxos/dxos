//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents, LayoutOperation } from '@dxos/app-toolkit';
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
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

import { translations } from '#translations';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';

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
  const { invokePromise } = useOperationInvoker();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = doc && Obj.getURI(doc);

  useAsyncEffect(async () => {
    if (space) {
      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: space.id });
    }
  }, [space, invokePromise]);

  if (!doc) {
    return <></>;
  }

  return (
    <div role='none' className='grid grid-cols-[1fr_20rem] bs-full is-full overflow-hidden divide-x divide-separator'>
      <Surface.Surface type={AppSurface.Article} data={{ subject: doc, attendableId: id }} limit={1} />
      <ObjectHistory role='article' subject={doc} attendableId={id} />
    </div>
  );
};

// The name popover portals to document.body, outside the story canvas.
const createRevisionViaUi = async (canvasElement: HTMLElement, name: string) => {
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

/**
 * Edit the document, create multiple checkpoints, then time-travel back and forward.
 */
export const TimeTravel: Story = {
  args: {
    content: 'one',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the editor to render the initial content.
    await waitFor(() => expect(editorContent(canvasElement)).toContain('one'), { timeout: 20_000 });

    // Revision 1.
    await createRevisionViaUi(canvasElement, 'v1');

    // Edit + revision 2 (the live editor reflects the data-layer edit).
    setRootContent('one two');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('one two'));
    await createRevisionViaUi(canvasElement, 'v2');

    // Further edits leave the tip ahead of both checkpoints.
    setRootContent('one two three');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('one two three'));

    // An unnamed revision displays as its formatted creation date.
    await createRevisionViaUi(canvasElement, '');
    await canvas.findByText(new RegExp(new Date().toLocaleDateString()));

    // Travel back to v1: read-only banner + historical content.
    await userEvent.click(canvas.getByText('v1'));
    await canvas.findByText('Viewing checkpoint');
    await waitFor(() => expect(editorContent(canvasElement)).toBe('one'));

    // Forward to v2.
    await userEvent.click(canvas.getByText('v2'));
    await waitFor(() => expect(editorContent(canvasElement)).toBe('one two'));

    // Back to the present: banner gone, tip content restored.
    await userEvent.click(canvas.getByText('Now'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('one two three'));
    await waitFor(() => expect(canvas.queryByText('Viewing checkpoint')).toBeNull());
  },
};

/**
 * Edit the document, branch it, edit both sides, then merge the branch back.
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
    await canvas.findByText('Editing branch');

    // Edit the branch (visible in the editor, which is bound to the branch via a binding).
    await setBranchContent('draft', 'alpha\nbravo\ncharlie\n');
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));

    // Concurrent edit on the parent (not visible while the branch is selected).
    setRootContent('alpha edited\nbravo\n');
    await waitFor(() => expect(editorContent(canvasElement)).not.toContain('alpha edited'));

    // Merge via the banner ('Merge' also labels the panel row's icon button, so scope the query);
    // both edits land on main and the editor returns to it.
    const banner = canvas.getByRole('status');
    await userEvent.click(within(banner).getByText('Merge'));
    await waitFor(() => expect(editorContent(canvasElement)).toContain('alpha edited'), { timeout: 10_000 });
    await waitFor(() => expect(editorContent(canvasElement)).toContain('charlie'));
    await waitFor(() => expect(canvas.queryByText('Editing branch')).toBeNull());

    // The merge auto-checkpoint appears in the timeline.
    await canvas.findByText('merge: draft');
  },
};

/**
 * Conflict-marker blocks in the document render with inline resolution buttons (and merge markers
 * must not be styled as blockquotes). Core branches CRDT-merge without conflicts, so markers now
 * arise only from external/imported content (or legacy content-copy merges) — seeded directly here.
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
