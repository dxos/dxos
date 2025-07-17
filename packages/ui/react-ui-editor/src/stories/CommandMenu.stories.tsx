//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import { type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef } from 'react';

import { Obj, Query } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { createObjectFactory, Testing, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, names } from './components';
import {
  CommandMenu,
  type CommandMenuGroup,
  type CommandMenuItem,
  RefPopover,
  coreSlashCommands,
  filterItems,
  insertAtCursor,
  insertAtLineStart,
  linkSlashCommands,
} from '../components';
import { useCommandMenu, type UseCommandMenuOptions } from '../extensions';
import { str } from '../testing';
import { createElement } from '../util';

const generator: ValueGenerator = faker as any;

type StoryProps = Omit<UseCommandMenuOptions, 'viewRef'> & { text: string };

const DefaultStory = ({ text, ...options }: StoryProps) => {
  const viewRef = useRef<EditorView>();
  const { commandMenu, groupsRef, currentItem, onSelect, ...props } = useCommandMenu({ viewRef, ...options });

  return (
    <RefPopover modal={false} {...props}>
      <EditorStory ref={viewRef} text={text} placeholder={''} extensions={commandMenu} />
      <CommandMenu groups={groupsRef.current} currentItem={currentItem} onSelect={onSelect} />
    </RefPopover>
  );
};

const groups: CommandMenuGroup[] = [
  coreSlashCommands,
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

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-editor/CommandMenu',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: (args) => <DefaultStory {...args} />,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

// TODO(burdon): Not working.
export const Slash: Story = {
  args: {
    text: str('# Slash', '', names.join(' '), ''),
    trigger: '/',
    placeholder: {
      content: () => {
        return createElement('div', undefined, [
          createElement('span', { text: 'Press' }),
          createElement('span', { className: 'border border-separator rounded-sm mx-1 px-1', text: '/' }),
          createElement('span', { text: 'for commands' }),
        ]);
      },
    },
    getMenu: (text) => {
      return filterItems(groups, (item) =>
        text ? (item.label as string).toLowerCase().includes(text.toLowerCase()) : true,
      );
    },
  },
};

export const Link: Story = {
  render: (args) => {
    const { space } = useClientProvider();
    const getMenu = useCallback(
      async (trigger: string, query?: string): Promise<CommandMenuGroup[]> => {
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
            (object): CommandMenuItem => ({
              id: object.id,
              label: object.name,
              icon: 'ph--user--regular',
              onSelect: (view, head) => {
                const link = `[${object.name}][${Obj.getDXN(object)}]`;
                if (query?.startsWith('@')) {
                  insertAtLineStart(view, head, `!${link}\n`);
                } else {
                  insertAtCursor(view, head, `${link} `);
                }
              },
            }),
          );
        return [{ id: 'echo', items }];
      },
      [space],
    );

    return <DefaultStory {...args} getMenu={getMenu} />;
  },
  args: {
    text: str('# Link', '', names.join(' '), ''),
    trigger: ['/', '@'],
  },
  decorators: [
    withClientProvider({
      createSpace: true,
      onInitialized: async (client) => {
        client.addTypes([Testing.Contact]);
      },
      onSpaceCreated: async ({ space }) => {
        const createObjects = createObjectFactory(space.db, generator);
        await createObjects([{ type: Testing.Contact, count: 10 }]);
        await space.db.flush({ indexes: true });
      },
    }),
  ],
};
