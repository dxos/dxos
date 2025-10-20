//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef } from 'react';

import { Obj, Query } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Domino } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Testing, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';

import {
  type PopoverMenuGroup,
  type PopoverMenuItem,
  PopoverMenuProvider,
  type UsePopoverMenuProps,
  filterItems,
  formattingCommands,
  insertAtCursor,
  insertAtLineStart,
  linkSlashCommands,
  usePopoverMenu,
} from '../extensions';
import { str } from '../testing';

import { EditorStory } from './components';

const generator: ValueGenerator = faker as any;

type StoryProps = Omit<UsePopoverMenuProps, 'viewRef'> & { text: string };

const DefaultStory = ({ text, ...props }: StoryProps) => {
  const viewRef = useRef<EditorView>(null);
  const { groupsRef, extension, ...menuProps } = usePopoverMenu({ viewRef, ...props });

  return (
    <PopoverMenuProvider groups={groupsRef.current} {...menuProps}>
      <EditorStory ref={viewRef} text={text} extensions={extension} />
    </PopoverMenuProvider>
  );
};

const groups: PopoverMenuGroup[] = [
  formattingCommands,
  linkSlashCommands,
  {
    id: 'custom',
    label: 'Custom',
    items: [
      {
        id: 'custom-1',
        label: 'Log',
        icon: 'ph--log--regular',
        onSelect: console.log,
      },
    ],
  },
];

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
    text: str('# Slash', ''),
    trigger: '/',
    placeholder: {
      content: () =>
        Domino.of('div')
          .children(
            Domino.of('span').text('Press'),
            Domino.of('span').text('/').classNames('border border-separator rounded-sm mx-1 px-1'),
            Domino.of('span').text('for commands'),
          )
          .build(),
    },
    getMenu: () => groups,
  },
};

export const Link: Story = {
  render: (args: StoryProps) => {
    const { space } = useClientProvider();
    const getMenu = useCallback(
      async (trigger: string, query?: string): Promise<PopoverMenuGroup[]> => {
        if (trigger === '/') {
          return filterItems(groups, (item) =>
            query ? (item.label as string).toLowerCase().includes(query.toLowerCase()) : true,
          );
        }

        if (!space) {
          return [];
        }

        const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
        const result = await space?.db.query(Query.type(Testing.Contact)).run();
        const items = result.objects
          .filter((object) => object.name.toLowerCase().includes(name))
          .map(
            (object): PopoverMenuItem => ({
              id: object.id,
              label: object.name,
              icon: 'ph--user--regular',
              onSelect: (view, head) => {
                const link = `[${object.name}](${Obj.getDXN(object)})`;
                if (query?.startsWith('@')) {
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
  },
  decorators: [
    withClientProvider({
      createSpace: true,
      onInitialized: async (client) => {
        client.addTypes([Testing.Contact]);
      },
      onCreateSpace: async ({ space }) => {
        const createObjects = createObjectFactory(space.db, generator);
        await createObjects([{ type: Testing.Contact, count: 10 }]);
        await space.db.flush({ indexes: true });
      },
    }),
  ],
  args: {
    text: str('# Link', ''),
    trigger: ['/', '@'],
    getMenu: () => [],
  },
};
