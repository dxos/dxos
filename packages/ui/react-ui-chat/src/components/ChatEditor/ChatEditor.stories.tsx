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

// The `commands` extension isn't JSON-serializable, so it's built in `render` rather than passed
// through `args` (Storybook's controls addon warns on cyclic arg values).
const WithCommandsRender = (args: ChatEditorProps) => {
  const extensions = useMemo(() => commands({ getCommands: () => projectCommands }), []);
  return <ChatEditor {...args} extensions={extensions} />;
};

export const WithCommands: Story = {
  render: WithCommandsRender,
  args: {
    classNames,
    placeholder: 'Type $ for commands...',
  },
  play: async ({ canvasElement }) => {
    const content = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.cm-content');
      void expect(element).not.toBeNull();
      return element!;
    });

    await userEvent.click(content);
    await userEvent.type(content, '$t');

    // The sentinel-command popover lists only prefix matches for the typed token. The matched
    // prefix renders in its own span, so read the option label's full text rather than matching text nodes.
    const optionLabels = () =>
      Array.from(canvasElement.querySelectorAll('.cm-completionLabel')).map((node) => node.textContent);
    await waitFor(() => expect(optionLabels()).toEqual(['$track']));
  },
};
