//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { userEvent, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';

import { SpaceTemplateToolbar, StoryRole } from '../modules';
import { ModuleContainer, VoyageSpacePlugin, config, createDecorators, storyParameters } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Projects',
  // Rows, not a fragment: `ModuleContainer` pins itself to its nearest positioned ancestor, so a
  // bare sibling of the toolbar would cover it.
  render: (args) => (
    <div className='dx-grow grid grid-rows-[min-content_1fr]'>
      <SpaceTemplateToolbar />
      <div className='relative'>
        <ModuleContainer {...args} />
      </div>
    </div>
  ),
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

const storyOptions = {
  skills: [AssistantSkill.key, Sandbox.SKILL_KEY],
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
      DebugPlugin,
      SandboxPlugin,
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
      import('@dxos/plugin-debug/DebugPlugin'),
      import('@dxos/plugin-sandbox/SandboxPlugin'),
    ]);
    return {
      plugins: [
        // A space template's `apply` writes through the space DB, and the objects it creates surface
        // through these plugins' articles.
        SpacePlugin({}),
        InboxPlugin(),
        ProjectsPlugin.make(),
        // Declared in Projects' `dependsOn`, so the manager refuses to resolve it without Tasks.
        TasksPlugin.make(),
        CrmPlugin.make(),
        // Contributes the sample spaces (Northwind Sales, Tidepool, Chess MCP) as space
        // templates — the ones the app's create-space dialog offers.
        DebugPlugin.make(),
        // Contributes the Sandbox skill and its operations: without it the agent has no
        // command-execution tool and answers every shell task as blocked.
        SandboxPlugin.make(),
        VoyageSpacePlugin,
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
        Sandbox.Sandbox,
      ],
    };
  },
  // No seeding here: each template owns a space of its own, created by the toolbar.
};

/**
 * Persistent storage for the story a human drives: the spaces the templates create — and the
 * conversations held in them — survive a reload, so switching back to a template reopens its work
 * rather than scaffolding it again.
 */
const persistentDecorators = createDecorators({ ...storyOptions, config: config.persistent });

/** Ephemeral, for the play test: a fixture that outlives the run would make the next one lie. */
const decorators = createDecorators(storyOptions);

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
 * panel. The toolbar lists the contributed space templates; picking one resets the space to that
 * template's content — project, mailbox, accounts, documents — and binds a fresh chat to the
 * project it created. Instructions (text + sentinel commands) reach the system prompt through that
 * binding.
 *
 * Test:
 * 1. Wait for the chat prompt to activate (context chips show "Voyage" and "Instructions").
 * 2. Send "What project are you assisting with?" — the reply names Voyage and ends with AHOY.
 * 3. Send "$track buy milk" — the reply is exactly "TRACKED: buy milk" (plus AHOY per the instructions).
 * 4. Type "$" in the prompt — the autocomplete offers `$track`.
 * 5. Pick "Tidepool — Offline sync v2" — the project column shows that work-stream with its task
 *    tree and documents, and the chat starts empty against it.
 */
export const Default: Story = {
  decorators: persistentDecorators,
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
