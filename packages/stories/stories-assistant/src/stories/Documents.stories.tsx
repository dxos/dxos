//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ToolId } from '@dxos/ai';
import { Script, Skill, Template } from '@dxos/compute';
import { Filter, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { CommentSkill } from '@dxos/plugin-comments/skills';
import { Markdown, MarkdownSkill } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Module, ModuleContainer, addToRootCollection, config, createDecorators } from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Documents',
  render: ModuleContainer,
  decorators: storyDecorators,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

const MARKDOWN_DOCUMENT = trim`
  # DXOS

  DXOS is an open-source platform for building local-first, decentralized, and collaborative applications. 
  Its core premise is that user data should live on user devices and synchronize directly between peers, rather than being locked inside centralized cloud servers. 
  This approach preserves privacy, keeps apps responsive and functional offline, and removes the operational burden of running backend infrastructure. 
  Developers use DXOS to add real-time, multiplayer collaboration to their applications without having to design and maintain their own sync engine.

  At the heart of DXOS is **ECHO**, a decentralized database that handles data storage, replication, and automatic conflict resolution. 
  ECHO is built on Automerge, a Conflict-free Replicated Data Type (CRDT) that allows many users to edit the same data concurrently without losing changes or producing conflicts. 
  The result is transparent, peer-to-peer data synchronization that behaves reliably even when devices go offline and reconnect later, making shared state feel seamless across collaborators and devices.

  For developers, DXOS packages these protocols into SDKs and tooling that lower the barrier to building sophisticated collaborative software.
  Rather than assembling authentication, real-time sync, and networking from scratch, teams can focus on their application's features while DXOS handles the hard distributed-systems problems underneath. 
  This makes it a compelling foundation for anyone building modern apps that prioritize user ownership of data, offline capability, and privacy-preserving collaboration.
`;

const STYLE_GUIDE = trim`
  # Style Guide

  - Use short, simple sentences.
  - Organize content with headings and bullet points.
  - Avoid jargon and explain technical terms.
  - Use active voice whenever possible.
  - Highlight key points in bold.
  - Keep paragraphs brief and focused on one idea.
  - Proofread for clarity and correctness.
`;

const addSpellingMistakes = (text: string, mistakeCount: number, noise = ''): string => {
  const words = text.split(' ');
  for (let mistakeIndex = 0; mistakeIndex < mistakeCount; mistakeIndex++) {
    const idx = Math.floor(Math.random() * words.length);
    const word = words[idx];
    const charIdx = Math.floor(Math.random() * word.length);
    const typoChar = String.fromCharCode(word.charCodeAt(charIdx) + 1);
    words[idx] = word.slice(0, charIdx) + typoChar + word.slice(charIdx + 1) + noise;
  }

  return words.join(' ');
};

/**
 * Test with prompt: Propose changes to my document based on the style guide.
 */
export const WithMarkdown: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      // SpacePlugin contributes the `versioning-state` capability that the Comments article surface
      // (and the versioning UI) reads; without it the story throws "No capability found".
      const [{ MarkdownPlugin }, { CommentsPlugin }, { SpacePlugin }] = await Promise.all([
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-comments/plugin'),
        import('@dxos/plugin-space/plugin'),
      ]);
      return {
        plugins: [MarkdownPlugin(), CommentsPlugin({}), SpacePlugin({})],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const document = space.db.add(
        Markdown.make({
          name: 'DXOS',
          content: addSpellingMistakes(MARKDOWN_DOCUMENT, 3, '!!!').replaceAll(/(?<!\n)\n(?!\n)/g, '\n\n'),
        }),
      );
      const styleGuide = space.db.add(
        Markdown.make({
          name: 'Style Guide',
          content: STYLE_GUIDE,
        }),
      );
      // Register the documents in the space root collection so plugin-space builds app-graph nodes
      // for them — this is what makes the editor's comment toolbar (a graph action) resolvable.
      addToRootCollection(space, [document, styleGuide]);
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Document], [Module.History, Module.Comments]],
    skills: [AssistantSkill.key, MarkdownSkill.key, CommentSkill.key],
  },
};

/**
 * Enters a prompt into the chat that asks the assistant to rewrite the document to match the style
 * guide (both are bound into the chat context). The assistant uses the markdown update tool to edit
 * the live document in place.
 *
 * Live AI and timing-sensitive, so it is excluded from CI `test` runs (`tags: ['!test']`); run it
 * manually in storybook (it needs a reachable EDGE AI service via `config.remote`).
 */
export const WithMarkdownStyleGuide: Story = {
  ...WithMarkdown,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, 'Update the Document to obey the Style Guide');
  },
};

/**
 * As above, but asks the assistant to make the edits on a NEW branch rather than the live document.
 * The assistant creates a branch (create-branch tool) and applies the style-guide edits to it
 * (update tool with the branchId), leaving the branch unmerged for review — the input to Phase 2's
 * branch-diff view.
 *
 * Live AI and timing-sensitive, so it is excluded from CI `test` runs (`tags: ['!test']`); run it
 * manually in storybook (it needs a reachable EDGE AI service via `config.remote`).
 */
export const WithMarkdownStyleGuideBranch: Story = {
  ...WithMarkdown,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, 'Update the Document in a new branch to obey the Style Guide');
  },
};

/** Types a prompt into the chat's CodeMirror editor and submits it, asserting it lands as a message. */
const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {
  const canvas = within(canvasElement);

  // The chat prompt is a CodeMirror editor; locate it via its placeholder.
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }

  await userEvent.click(editor);
  await userEvent.type(editor, prompt);
  await userEvent.keyboard('{Enter}');

  // Submitting clears the editor (its text reverts to the placeholder) and posts the prompt as a
  // message in the thread. The live agent then responds — not asserted here.
  await waitFor(() => expect(editor.textContent).not.toContain(prompt));
  await canvas.findByText(prompt, {}, { timeout: 30_000 });
};

export const WithSkills: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { TablePlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-table/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), MarkdownPlugin(), TablePlugin()],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      space.db.add(Markdown.make({ name: 'Tasks' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Tasks, Module.Skill]],
  },
};

export const WithScript: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { ScriptPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-script/plugin'),
      ]);
      return {
        plugins: [MarkdownPlugin(), ScriptPlugin()],
      };
    },
    config: config.local,
    types: [Script.Script, Text.Text],
    onInit: async ({ client, space }) => {
      const [{ getAccessCredential }, { templates }] = await Promise.all([
        import('@dxos/plugin-script'),
        import('@dxos/plugin-script/templates'),
      ]);
      const { identityKey } = client.halo.identity.get()!;
      await client.halo.writeCredentials([getAccessCredential(identityKey)]);

      const template = templates.find((template) => template.id === 'org.dxos.script.forex-effect');
      invariant(template, 'Template not found');
      invariant(template.name, 'Template name not found');

      // Ensure at least one Script exists so the React surface can render.
      space.db.add(
        Script.make({
          name: template.name,
          description: 'Function to get the exchange rates between two currencies.',
          changed: true,
          source: template.source,
        }),
      );

      space.db.add(
        Skill.make({
          key: 'org.dxos.skill.forex',
          name: 'Forex',
          instructions: Template.make({
            source: trim`
              You can get the exchange rate between two currencies.
            `,
          }),
          tools: [ToolId.make('org.dxos.script.forex-effect')],
        }),
      );

      await space.db.flush();
    },
    onChatCreated: async ({ space, binder }) => {
      const skills = await space.db.query(Query.select(Filter.type(Skill.Skill))).run();
      await binder.bind({ skills: skills.map((skill) => Ref.make(skill)) });
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Script]],
  },
};
