//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Obj, Query } from '@dxos/echo';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TestSchema, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Domino, mx } from '@dxos/ui';
import { insertAtCursor, insertAtLineStart, join } from '@dxos/ui-editor';

import {
  type EditorController,
  type EditorMenuGroup,
  type EditorMenuItem,
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseEditorMenuProps,
  createMenuGroup,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
  useEditorMenu,
} from '../components';
import { EditorStory } from './components';

const generator: ValueGenerator = random as any;

const customCompletions: EditorMenuGroup = createMenuGroup({
  id: 'test',
  items: ['Hello world!', 'Hello DXOS', 'Hello Composer', 'https://dxos.org'],
});

const placeholder = (trigger: string[]) => {
  const pressEl = Domino.of('span').text('Press');
  const triggerEls = trigger.map((trigger) =>
    Domino.of('span').classNames(mx('border border-separator rounded-xs mx-1 px-1 py-[2px] pb-[3px]')).text(trigger),
  );
  const forCommandsEl = Domino.of('span').text('for commands');
  return Domino.of('div').append(pressEl, ...triggerEls, forCommandsEl).root;
};

type StoryArgs = Omit<UseEditorMenuProps, 'viewRef'> &
  Pick<EditorMenuProviderProps, 'searchPlaceholder'> & { text: string };

const DefaultStory = ({ text, searchPlaceholder, ...props }: StoryArgs) => {
  const [controller, setController] = useState<EditorController | null>(null);
  const { groupsRef, extension, ...menuProps } = useEditorMenu(props);
  const getView = useCallback(() => controller?.view ?? null, [controller]);

  return (
    <EditorMenuProvider
      getView={getView}
      groups={groupsRef.current}
      searchPlaceholder={searchPlaceholder}
      {...menuProps}
    >
      <EditorStory ref={setController} text={text} extensions={extension} />
    </EditorMenuProvider>
  );
};

const LinkStory = (args: StoryArgs) => {
  const { space } = useClientStory();

  const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    async ({ text, trigger }): Promise<EditorMenuGroup[]> => {
      if (trigger === '/') {
        return filterMenuGroups([linkSlashCommands], (item) =>
          text ? (item.label as string).toLowerCase().includes(text.toLowerCase()) : true,
        );
      }

      if (!space) {
        return [];
      }

      const name = text?.startsWith('@') ? text.slice(1).toLowerCase() : (text?.toLowerCase() ?? '');
      const result = await space?.db.query(Query.type(TestSchema.Person)).run();
      const items = result
        .filter((object) => object.name.toLowerCase().includes(name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (object): EditorMenuItem => ({
            id: object.id,
            label: object.name,
            icon: 'ph--user--regular',
            onSelect: ({ view, head }) => {
              const link = `[${object.name}](${Obj.getURI(object)})`;
              if (text?.startsWith('@')) {
                insertAtLineStart(view, head, `!${link}\n`);
              } else {
                insertAtCursor(view, head, `${link} `);
              }
            },
          }),
        );

      // Mirrors the plugin's picker, where this opens the app's create-object dialog.
      const createItem: EditorMenuItem = {
        id: 'create-object',
        label: 'Add object',
        icon: 'ph--plus--regular',
        onSelect: ({ view, head }) => insertAtCursor(view, head, `[${name || 'New object'}](dxn:echo:@:new) `),
      };

      return [
        { id: 'create', items: [createItem] },
        { id: 'test', items },
      ];
    },
    [space],
  );

  return <DefaultStory {...args} getMenu={getMenu} />;
};

const meta = {
  title: 'ui/react-ui-editor/Popover',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: join('# Autocomplete', '', ''),
    triggerKey: 'Ctrl-Space',
    filter: true,
    getMenu: () => [customCompletions],
  },
};

export const Formatting: Story = {
  args: {
    text: join('# Slash command', '', ''),
    trigger: '/',
    placeholder: {
      content: () => placeholder(['/']),
    },
    getMenu: () => [formattingCommands],
  },
};

export const Link: Story = {
  render: LinkStory,
  decorators: [
    withClientProvider({
      createSpace: true,
      onInitialized: async (client) => {
        await client.addTypes([TestSchema.Person]);
      },
      onCreateSpace: async ({ space }) => {
        const createObjects = createObjectFactory(space.db, generator);
        await createObjects([{ type: TestSchema.Person, count: 50 }]);
        await space.db.flush({ indexes: true });
      },
    }),
  ],
  args: {
    text: join('# Links', '', ''),
    trigger: ['/', '@'],
    // The "@" picker is a combobox: the query is typed into the popover, not the document.
    searchTriggers: ['@'],
    searchPlaceholder: 'Search or create…',
    placeholder: {
      content: () => placeholder(['/', '@']),
    },
  },
};
