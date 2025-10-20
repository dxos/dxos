//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

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
  createMenuGroup,
  filterMenuGroups,
  formattingCommands,
  insertAtCursor,
  insertAtLineStart,
  linkSlashCommands,
  usePopoverMenu,
} from '../extensions';
import { str } from '../testing';

import { EditorStory } from './components';

const generator: ValueGenerator = faker as any;

const customCompletions: PopoverMenuGroup = createMenuGroup({
  id: 'test',
  items: ['Hello world!', 'Hello DXOS', 'Hello Composer', 'https://dxos.org'],
});

const placeholder = (trigger: string[]) =>
  Domino.of('div')
    .children(
      Domino.of('span').text('Press'),
      ...trigger.map((trigger) =>
        Domino.of('span')
          .text(trigger)
          .classNames('border border-separator rounded-sm mx-1 pis-1 pie-1 pbs-[2px] pbe-[3px]'),
      ),
      Domino.of('span').text('for commands'),
    )
    .build();

type StoryProps = Omit<UsePopoverMenuProps, 'viewRef'> & { text: string };

const DefaultStory = ({ text, ...props }: StoryProps) => {
  const [view, setView] = useState<EditorView | null>(null);
  const { groupsRef, extension, ...menuProps } = usePopoverMenu(props);

  return (
    <PopoverMenuProvider view={view} groups={groupsRef.current} {...menuProps}>
      <EditorStory ref={setView} text={text} extensions={extension} />
    </PopoverMenuProvider>
  );
};

const LinkStory = (args: StoryProps) => {
  const { space } = useClientProvider();
  const getMenu = useCallback<NonNullable<UsePopoverMenuProps['getMenu']>>(
    async (text, trigger): Promise<PopoverMenuGroup[]> => {
      if (trigger === '/') {
        return filterMenuGroups([linkSlashCommands], (item) =>
          text ? (item.label as string).toLowerCase().includes(text.toLowerCase()) : true,
        );
      }

      if (!space) {
        return [];
      }

      const name = text?.startsWith('@') ? text.slice(1).toLowerCase() : (text?.toLowerCase() ?? '');
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
    text: str('# Autocomplete', '', ''),
    triggerKey: 'Ctrl-Space',
    filter: true,
    getMenu: () => [customCompletions],
  },
};

export const Formatting: Story = {
  args: {
    text: str('# Slash command', '', ''),
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
    text: str('# Links', '', ''),
    trigger: ['/', '@'],
    placeholder: {
      content: () => placeholder(['/', '@']),
    },
  },
};
