//
// Copyright 2023 DXOS.org
//

import { Info, Plus, Trash, X } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { getSize } from '@dxos/aurora-theme';
import { invariant } from '@dxos/invariant';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Stack } from './Stack';
import { StackAction, StackMenu } from './StackMenu';
import { StackRow } from './StackRow';
import { Item } from '../../layout';
import { createItem, SeedDecorator, TestData } from '../../testing';
import { ScrollContainer } from '../ScrollContainer';

const num = 8;

const stackAction = {
  id: 'delete',
  label: 'Delete',
  Icon: X,
};

const sectionMenuActions = (section?: any): StackAction[][] => {
  const actions: StackAction[][] = [
    [
      {
        id: 'insert',
        label: 'Insert',
        Icon: Plus,
      },
    ],
  ];

  if (section) {
    actions.push([
      {
        id: 'delete',
        label: 'Delete',
        Icon: Trash,
      },
    ]);
  }

  return actions;
};

const StackSection: FC<{ section: Item<TestData>; onSelect?: () => void }> = ({ section, onSelect }) => {
  return (
    <div className='flex flex-col w-full space-y-2'>
      <div className='flex text-xl'>{section.data?.title}</div>
      <div className='flex text-sm text-zinc-600'>{section.data?.description}</div>
      <div className='flex text-xs text-zinc-500 items-center'>
        <div className='pr-2 cursor-pointer' onClick={() => onSelect?.()}>
          <Info className={getSize(4)} />
        </div>
        <span className='text-orange-800'>{section.id}</span>
      </div>
    </div>
  );
};

const Test = () => {
  const [sections, setSections] = useState<Item<TestData>[]>(() => range(num).map(() => createItem()));
  const [selected, setSelected] = useState<string>();

  const handleAction = (action: StackAction, section?: any) => {
    switch (action.id) {
      case 'insert': {
        setSections((sections) => {
          const idx = sections.findIndex(({ id }) => id === section?.id);
          sections.splice(idx === -1 ? sections.length : idx, 0, createItem());
          return [...sections];
        });
        break;
      }

      case 'delete': {
        invariant(section);
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
          ContextMenu={({ section }) => <StackMenu actions={sectionMenuActions(section)} onAction={handleAction} />}
          ActionButton={() => <StackAction action={stackAction} onAction={handleAction} />}
          sections={sections}
          selected={selected}
          onSelect={(section) => setSelected(section?.id)}
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
        <div className='flex w-full md:w-[700px] h-full'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
