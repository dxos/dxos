//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ChatEditor } from './ChatEditor';
import { type ReferenceData } from './references';

const meta = {
  title: 'ui/react-ui-chat/ChatEditor',
  component: ChatEditor,
  decorators: [withTheme],
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
    uri: 'dxn:echo:@:AAAAAAAA',
    label: 'Meeting Notes',
  },
  {
    uri: 'dxn:echo:@:BBBBBBBB',
    label: 'Project Plan',
  },
  {
    uri: 'dxn:echo:@:CCCCCCCC',
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
