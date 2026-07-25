//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatEditor, type ChatEditorProps } from './ChatEditor';
import { type CommandData, commands } from './commands';
import { type ReferenceData } from './references';

const meta = {
  title: 'ui/react-ui-chat/ChatEditor',
  component: ChatEditor,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ChatEditor>;

export default meta;

const classNames = 'w-[20rem] p-2 border border-separator';

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames,
    placeholder: 'Ask a question...',
  },
};

export const Markdown: Story = {
  args: {
    classNames,
    markdown: true,
    placeholder: 'Type **markdown**...',
  },
};

// TODO(burdon): Restore and reconcile with suggest/typeahead.
export const WithSuggestions: Story = {
  args: {
    classNames,
    onSubmit: (text) => {
      log('onSubmit', { text });
    },

    // onSuggest: (text) => {
    //   const trimmed = text.trim().toLowerCase();
    //   if (trimmed.length < 2) {
    //     return [];
    //   }
    //   const suggestions = [
    //     'Create a kanban board',
    //     'Create a new project',
    //     'Find flights to Tokyo',
    //     "Let's play chess",
    //     'Show me Paris on a map',
    //   ];
    //   return suggestions.filter((s) => s.toLowerCase().startsWith(text));
    // },
  },
};

// TODO(burdon): Replace.
const references: ReferenceData[] = [
  {
    uri: 'echo:/AAAAAAAA',
    label: 'Meeting Notes',
  },
  {
    uri: 'echo:/BBBBBBBB',
    label: 'Project Plan',
  },
  {
    uri: 'echo:/CCCCCCCC',
    label: 'Meeting Plan',
  },
];

export const WithReferences: Story = {
  args: {
    classNames,
    references: {
      provider: {
        getReferences: async ({ query }) => {
          const res = references.filter((i) => i.label.toLowerCase().startsWith(query.toLowerCase()));
          log('getReferences', { query, res });
          return res;
        },
        resolveReference: async ({ uri }) => {
          const res = references.find((i) => i.uri === uri);
          log('resolveReference', { uri, res });
          return res ?? null;
        },
      },
    },
  },
};

const projectCommands: CommandData[] = [
  { sentinel: '$track', description: 'Record a follow-up task' },
  { sentinel: '$hydrate', description: 'Checkpoint project state' },
];

// Reset per play run (module re-imports fresh on a vitest retry, so this doesn't leak across tests).
let submittedTexts: string[] = [];

// The `commands` extension isn't JSON-serializable, so it's built in `render` rather than passed
// through `args` (Storybook's controls addon warns on cyclic arg values).
const WithCommandsRender = (args: ChatEditorProps) => {
  const extensions = useMemo(() => commands({ getCommands: () => projectCommands }), []);
  return (
    <ChatEditor
      {...args}
      extensions={extensions}
      onSubmit={(text) => {
        submittedTexts.push(text);
        return true;
      }}
    />
  );
};

export const WithCommands: Story = {
  render: WithCommandsRender,
  args: {
    classNames,
    placeholder: 'Type $ for commands...',
  },
  play: async ({ canvasElement }) => {
    submittedTexts = [];

    const content = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.cm-content');
      if (!element) {
        throw new Error('Chat editor content not found.');
      }
      return element;
    });

    await userEvent.click(content);
    await userEvent.type(content, '$t');

    // The sentinel-command popover lists only prefix matches for the typed token. The matched
    // prefix renders in its own span, so read the option label's full text rather than matching text nodes.
    const optionLabels = () =>
      Array.from(canvasElement.querySelectorAll('.cm-completionLabel')).map((node) => node.textContent);
    await waitFor(() => expect(optionLabels()).toEqual(['$track']));

    // `acceptCompletion` ignores Enter within `interactionDelay` (75ms, default) of the popover
    // opening — an anti-flicker guard against an Enter that was already in flight before the
    // options rendered. Real usage always clears this; wait it out so the test presses Enter the
    // way a person would (after seeing the popover), not mid-guard.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Regression: `submit()`'s Enter binding must defer to the open completion popover (both sit at
    // `Prec.highest`) rather than swallowing Enter and submitting the raw "$t" text.
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(content.textContent).toEqual('$track'));
    void expect(submittedTexts).toEqual([]);

    // Enter with no completion open still submits and resets the editor (submit's own contract).
    // `userEvent.keyboard` (unlike `userEvent.type(content, ...)`) drives `document.activeElement`
    // directly, so it respects CodeMirror's actual cursor position instead of assuming one.
    await userEvent.keyboard(`${'{Backspace}'.repeat('$track'.length)}hello{Enter}`);
    await waitFor(() => expect(submittedTexts).toEqual(['hello']));
    await waitFor(() => expect(canvasElement.querySelector('.cm-placeholder')).not.toBeNull());
  },
};
