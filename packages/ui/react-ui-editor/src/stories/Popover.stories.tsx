//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Obj, Query } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { TestSchema, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Domino } from '@dxos/ui';
import { insertAtCursor, insertAtLineStart, join } from '@dxos/ui-editor';

import {
  type EditorController,
  type EditorMenuGroup,
  type EditorMenuItem,
  EditorMenuProvider,
  type UseEditorMenuProps,
  createMenuGroup,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
  useEditorMenu,
} from '../components';

import { EditorStory } from './components';

const generator: ValueGenerator = faker as any;

const customCompletions: EditorMenuGroup = createMenuGroup({
  id: 'test',
  items: ['Hello world!', 'Hello DXOS', 'Hello Composer', 'https://dxos.org'],
});

const placeholder = (trigger: string[]) =>
  Domino.of('div')
    .children(
      Domino.of('span').text('Press'),
      ...trigger.map((trigger) =>
        Domino.of('span').text(trigger).classNames('border border-separator rounded-sm mx-1 pli-1 pbs-[2px] pbe-[3px]'),
      ),
      Domino.of('span').text('for commands'),
    )
    .build();

type StoryProps = Omit<UseEditorMenuProps, 'viewRef'> & { text: string };

const DefaultStory = ({ text, ...props }: StoryProps) => {
  const [controller, setController] = useState<EditorController | null>(null);
  const { groupsRef, extension, ...menuProps } = useEditorMenu(props);

  return (
    <EditorMenuProvider view={controller?.view} groups={groupsRef.current} {...menuProps}>
      <EditorStory ref={setController} text={text} extensions={extension} />
    </EditorMenuProvider>
  );
};

const LinkStory = (args: StoryProps) => {
  const { space } = useClientProvider();

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
        .map(
          (object): EditorMenuItem => ({
            id: object.id,
            label: object.name,
            icon: 'ph--user--regular',
            onSelect: ({ view, head }) => {
              const link = `[${object.name}](${Obj.getDXN(object)})`;
              if (text?.startsWith('@')) {
                insertAtLineStart(view, head, `!${link}\n`);
              } else {
                insertAtCursor(view, head, `${link} `);
              }
            },
          }),
        );

      return [{ id: 'test', items }];
    },
    [space],
  );

  return <DefaultStory {...args} getMenu={getMenu} />;
};

const meta = {
  title: 'ui/react-ui-editor/Popover',
  render: DefaultStory,
  decorators: [withTheme],
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
        await createObjects([{ type: TestSchema.Person, count: 10 }]);
        await space.db.flush({ indexes: true });
      },
    }),
  ],
  args: {
    text: join('# Links', '', ''),
    trigger: ['/', '@'],
    placeholder: {
      content: () => placeholder(['/', '@']),
    },
  },
};
