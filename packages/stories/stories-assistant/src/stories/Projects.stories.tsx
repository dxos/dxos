//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';

import { StoryRole } from '../modules';
import { ModuleContainer, VoyageTemplatePlugin, createDecorators, storyParameters } from '../testing';

/** The subject every project template scaffolds from; the subject-free ones ignore it. */
const MAILBOX_NAME = 'Clients';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Projects',
  render: ModuleContainer,
  parameters: {
    ...storyParameters,
    translations: [
      ...storyParameters.translations,
      ...projectsTranslations,
      ...inboxTranslations,
      ...tasksTranslations,
    ],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const decorators = createDecorators({
  skills: [AssistantSkill.key],
  lazyPlugins: async () => {
    const [
      { Instructions, Project, Routine },
      { Collection, Feed },
      { Text, TagIndex },
      { Mailbox },
      { SpacePlugin },
      { InboxPlugin },
      ProjectsPlugin,
      TasksPlugin,
      CrmPlugin,
    ] = await Promise.all([
      import('@dxos/compute'),
      import('@dxos/echo'),
      import('@dxos/schema'),
      import('@dxos/plugin-inbox'),
      import('@dxos/plugin-space/testing'),
      import('@dxos/plugin-inbox/testing'),
      import('@dxos/plugin-projects/ProjectsPlugin'),
      import('@dxos/plugin-tasks/TasksPlugin'),
      import('@dxos/plugin-crm/CrmPlugin'),
    ]);
    return {
      plugins: [
        // `ProjectOperation.Create` files the scaffolded project with `SpaceOperation.AddObject`,
        // whose handler plugin-space owns.
        SpacePlugin({}),
        InboxPlugin(),
        ProjectsPlugin.make(),
        // Declared in Projects' `dependsOn`, so the manager refuses to resolve it without Tasks.
        TasksPlugin.make(),
        // Contributes the mailbox-subject templates (Sender Research, CRM Pipeline) that the
        // picker offers alongside plugin-projects' own Default and Inbox Research.
        CrmPlugin.make(),
        VoyageTemplatePlugin,
      ],
      types: [
        Project.Project,
        Instructions.Instructions,
        Routine.Routine,
        Collection.Collection,
        Text.Text,
        Mailbox.Mailbox,
        // The mailbox and every feed trigger spec resolve `Feed`; unregistered, feed-backed reads
        // come up empty.
        Feed.Feed,
        TagIndex.TagIndex,
      ],
    };
  },
  onInit: async ({ space }) => {
    const { Mailbox } = await import('@dxos/plugin-inbox');
    space.db.add(Mailbox.make({ name: MAILBOX_NAME }));
  },
});

const sharedArgs = {
  layout: [[StoryRole.Project], [StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
};

/**
 * Submit a prompt through the chat's CodeMirror editor. Submission is dropped silently while the
 * runtime is still activating or a previous response is streaming, so retry until the message
 * actually shows up in the thread (the editor clearing is NOT proof of submission).
 */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 60_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }
  const needle = text.slice(0, 30);
  const promptRoot = editor.closest('.cm-editor');
  const submitted = () =>
    [...canvasElement.querySelectorAll('*')].some(
      (node) =>
        node.childElementCount === 0 && node.closest('.cm-editor') !== promptRoot && node.textContent?.includes(needle),
    );
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!editor.textContent?.includes(needle)) {
      await userEvent.click(editor);
      await userEvent.type(editor, text);
    }
    await userEvent.keyboard('{Enter}');
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (submitted()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Prompt did not reach the thread.');
};

/** Poll the rendered thread until some element (outside the prompt editor) contains the needle. */
const waitForResponse = async (canvasElement: HTMLElement, needle: string, timeout = 240_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = [...canvasElement.querySelectorAll('*')].some(
      (node) => node.childElementCount === 0 && node.textContent?.includes(needle),
    );
    if (found) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for response containing "${needle}"`);
};

/**
 * Project-bound chat over a live AI stack, in three columns: the project, its chat, and the trace
 * panel. The project column's toolbar lists the contributed project templates; picking one resets
 * the space to a project scaffolded from it, with a fresh chat bound to it. Instructions (text +
 * sentinel commands) reach the system prompt through that binding.
 *
 * Test:
 * 1. Wait for the chat prompt to activate (context chips show "Voyage" and "Instructions").
 * 2. Send "What project are you assisting with?" — the reply names Voyage and ends with AHOY.
 * 3. Send "$track buy milk" — the reply is exactly "TRACKED: buy milk" (plus AHOY per the instructions).
 * 4. Type "$" in the prompt — the autocomplete offers `$track`.
 * 5. Pick "Sender Research (CRM)" — the project column shows that project (its own skills, the
 *    Clients mailbox as context, the sender-research routine) and the chat starts empty.
 */
export const Default: Story = {
  decorators,
  args: sharedArgs,
};

/**
 * Asserts the bound project instructions actually steer the model (marker word) and that sentinel
 * commands are followed. Live AI and slow, so excluded from CI runs (`tags: ['!test']`); run
 * manually in storybook against a reachable EDGE AI service.
 */
export const InstructionsTest: Story = {
  decorators,
  args: sharedArgs,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, 'In one short sentence: what project are you assisting with?');
    await waitForResponse(canvasElement, 'AHOY');

    await submitPrompt(canvasElement, '$track buy milk');
    await waitForResponse(canvasElement, 'TRACKED: buy milk');
  },
};
