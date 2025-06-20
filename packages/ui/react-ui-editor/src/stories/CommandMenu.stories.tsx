//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import { type StoryObj } from '@storybook/react';
import React, { useCallback, useRef } from 'react';

import { Obj, Query } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { createObjectFactory, Testing, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, names } from './components';
import {
  coreSlashCommands,
  filterItems,
  RefPopover,
  type CommandMenuGroup,
  CommandMenu,
  type CommandMenuItem,
  insertAtCursor,
  insertAtLineStart,
} from '../components';
import { useCommandMenu, type UseCommandMenuOptions } from '../extensions';
import { str } from '../testing';

const generator: ValueGenerator = faker as any;

type Args = Omit<UseCommandMenuOptions, 'viewRef'> & { text: string };

const Story = ({ text, ...options }: Args) => {
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

const meta: Meta<Args> = {
  title: 'ui/react-ui-editor/CommandMenu',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: (args) => <Story {...args} />,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Slash: StoryObj<Args> = {
  args: {
    trigger: '/',
    getGroups: (query) =>
      filterItems(groups, (item) =>
        query ? (item.label as string).toLowerCase().includes(query.toLowerCase()) : true,
      ),
    text: str('# Slash', '', names.join(' '), ''),
  },
};

export const Link: StoryObj<Args> = {
  render: (args) => {
    const { space } = useClientProvider();
    const getGroups = useCallback(
      async (trigger: string, query?: string): Promise<CommandMenuGroup[]> => {
        if (trigger === '/') {
          return filterItems(groups, (item) =>
            query ? (item.label as string).toLowerCase().includes(query.toLowerCase()) : true,
          );
        }

        if (!space) {
          return [];
        }

        const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : query?.toLowerCase() ?? '';
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

    return <Story {...args} getGroups={getGroups} />;
  },
  args: {
    trigger: ['/', '@'],
    text: str('# Link', '', names.join(' '), ''),
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
