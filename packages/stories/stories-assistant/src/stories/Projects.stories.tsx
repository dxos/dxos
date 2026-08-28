//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import { type Space } from '@dxos/react-client/echo';
import { trim } from '@dxos/util';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Projects',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Distinctive directives so a play function (or a human) can tell instructed behavior from chance.
const PROJECT_INSTRUCTIONS = trim`
  You are the assistant for the "Voyage" project.
  Always end every reply with the single word AHOY.
`;

const PROJECT_COMMANDS = [
  {
    sentinel: '$track',
    description: 'Track a follow-up item',
    prompt: 'Reply with exactly "TRACKED: <item>" where <item> is the text after the sentinel, then stop.',
  },
];

// Captured by `onInit` so play functions can assert on live objects.
let storySpace: Space | undefined;

const decorators = createDecorators({
  skills: [AssistantSkill.key],
  lazyPlugins: async () => {
    const [{ Instructions, Project, Routine }, { Collection, Text }, ProjectsPlugin, TasksPlugin] = await Promise.all([
      import('@dxos/compute'),
      Promise.all([import('@dxos/echo'), import('@dxos/schema')]).then(([echo, schema]) => ({
        Collection: echo.Collection,
        Text: schema.Text,
      })),
      import('@dxos/plugin-projects/ProjectsPlugin'),
      import('@dxos/plugin-tasks/TasksPlugin'),
    ]);
    return {
      // Declared in Projects' `dependsOn`, so the manager refuses to resolve it without Tasks.
      plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
      types: [Project.Project, Instructions.Instructions, Routine.Routine, Collection.Collection, Text.Text],
    };
  },
  onInit: async ({ space }) => {
    storySpace = space;
    const { Instructions, Project } = await import('@dxos/compute');
    const project = Project.make({ name: 'Voyage', description: 'Project chat-binding test fixture.' });
    const instructions = Instructions.make({
      name: 'Instructions',
      text: PROJECT_INSTRUCTIONS,
      commands: PROJECT_COMMANDS,
    });
    Obj.update(project, (project) => {
      project.instructions = Ref.make(instructions);
    });
    Obj.setParent(instructions, project);
    space.db.add(project);
    await space.db.flush({ indexes: true });
  },
  // Mirror ChatCompanion's project wiring: instructions steer via the chat's ref; skills and
  // context objects (plus the project itself) travel via bindings.
  onChatCreated: async ({ db, chat, binder }) => {
    const { Project } = await import('@dxos/compute');
    const [project] = await db.query(Filter.type(Project.Project)).run();
    if (!chat.instructions && project.instructions) {
      const instructionsRef = project.instructions;
      Obj.update(chat, (chat) => {
        chat.instructions = instructionsRef;
      });
    }
    const bindings = Project.contextBindings(project);
    if (bindings.skills.length > 0) {
      await binder.bind({ skills: [...bindings.skills] });
    }
    await binder.bind({ objects: [Ref.make(project), ...bindings.objects] });
  },
});

const sharedArgs = {
  layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
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
 * Project-bound chat over a live AI stack: the session is bound to the "Voyage" project, whose
 * Instructions (text + sentinel commands) flow into the system prompt via `Project.contextBindings`
 * + `formatSystemPrompt`.
 *
 * Test:
 * 1. Wait for the chat prompt to activate (context chips show "Voyage" and "Instructions").
 * 2. Send "What project are you assisting with?" — the reply names Voyage and ends with AHOY.
 * 3. Send "$track buy milk" — the reply is exactly "TRACKED: buy milk" (plus AHOY per the instructions).
 * 4. Type "$" in the prompt — the autocomplete offers `$track`.
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
