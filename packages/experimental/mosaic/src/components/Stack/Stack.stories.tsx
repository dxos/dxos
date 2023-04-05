//
// Copyright 2023 DXOS.org
//

import { Plus, Trash } from '@phosphor-icons/react';
import assert from 'assert';
import React, { FC, useState } from 'react';

import { range } from '@dxos/util';

import '@dxosTheme';

import { Item } from '../../layout';
import { createItem, SeedDecorator, TestData } from '../../testing';
import { ScrollContainer } from '../ScrollContainer';
import { Stack } from './Stack';
import { StackMenu, StackMenuItem } from './StackMenu';
import { StackRow } from './StackRow';

const num = 8;

const sectionMenuItems = (section?: any): StackMenuItem[][] => {
  const items: StackMenuItem[][] = [
    [
      {
        action: 'insert',
        label: 'Insert',
        Icon: Plus,
        onCreate: () => createItem()
      }
    ]
  ];

  if (section) {
    items.push([
      {
        action: 'delete',
        label: 'Delete',
        Icon: Trash
      }
    ]);
  }

  return items;
};

const StackSection: FC<{ section: Item<TestData> }> = ({ section }) => {
  return (
    <div className='flex flex-col w-full space-y-2'>
      <div className='text-xl'>{section.data?.title}</div>
      <div className='text-sm text-zinc-600'>{section.data?.description}</div>
      <div className='text-xs text-zinc-500'>{section.id}</div>
    </div>
  );
};

const Test = () => {
  const [sections, setSections] = useState<Item<TestData>[]>(() => range(num).map(() => createItem()));

  const handleMenu = (item: StackMenuItem, section?: any) => {
    switch (item.action) {
      case 'insert': {
        setSections((sections) => {
          const idx = sections.findIndex(({ id }) => id === section?.id);
          sections.splice(idx === -1 ? sections.length : idx, 0, item.onCreate!());
          return [...sections];
        });
        break;
      }

      case 'delete': {
        assert(section);
        setSections((sections) => {
          const idx = sections.findIndex(({ id }) => id === section.id);
          if (idx !== -1) {
            sections.splice(idx, 1);
          }

          return [...sections];
        });
        break;
      }
    }
  };

  const handleMoveSection = (id: string, from: number, to: number) => {
    setSections((sections) => {
      const section = sections.find((section) => section.id === id);
      sections.splice(from, 1);
      sections.splice(to, 0, section!);
      return [...sections];
    });
  };

  return (
    <div className='flex flex-col w-full h-full bg-white'>
      <ScrollContainer vertical>
        <StackRow slots={{ root: { className: 'pt-8 text-3xl' } }}>Stack</StackRow>
        <Stack<Item<TestData>>
          slots={{ root: { className: 'flex flex-1' }, section: { className: 'py-4' } }}
          StackSection={StackSection}
          ContextMenu={({ section }) => <StackMenu items={sectionMenuItems(section)} onSelect={handleMenu} />}
          sections={sections}
          onMoveSection={handleMoveSection}
        />
      </ScrollContainer>
    </div>
  );
};

export default {
  component: Stack,
  decorators: [
    SeedDecorator(999),
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-200'>
        <div className='flex w-[600px] h-full'>
          <Story />
        </div>
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <Test />
};
