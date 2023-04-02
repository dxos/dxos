//
// Copyright 2023 DXOS.org
//

import { ArrowCircleDown } from '@phosphor-icons/react';
import faker from 'faker';
import React, { FC, useState } from 'react';

import { getSize } from '@dxos/react-components';
import { range } from '@dxos/util';

import '@dxosTheme';

import { Item } from '../../layout';
import { createItem, TestData } from '../../testing';
import { ScrollContainer } from '../ScrollContainer';
import { Stack } from './Stack';
import { StackRow } from './StackRow';

faker.seed(100);

const num = 8;

const StackSection: FC<{ section: Item<TestData> }> = ({ section }) => {
  return (
    <div className='flex flex-col w-full space-y-2'>
      <div className='text-xl'>{section.data?.title}</div>
      <div className='text-sm text-zinc-600'>{section.data?.description}</div>
      <div className='text-xs text-zinc-500'>{section.id}</div>
    </div>
  );
};

const Menu: FC = () => {
  return (
    <div className='p-1 cursor-pointer'>
      <button>
        <ArrowCircleDown className={getSize(6)} />
      </button>
    </div>
  );
};

const Test = () => {
  const [sections, setSections] = useState<Item<TestData>[]>(() => range(num).map(() => createItem()));

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
          ContextMenu={<Menu />}
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
