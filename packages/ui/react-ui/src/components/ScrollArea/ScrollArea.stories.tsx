//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { faker } from '@dxos/random';
import { activeSurface, surfaceShadow } from '@dxos/ui-theme';

import { withLayout, withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';

faker.seed(1234);

const DefaultStory = ({ children }: PropsWithChildren<{}>) => {
  return (
    <ScrollArea.Root
      classNames={['is-[300px] bs-[400px] rounded', activeSurface, surfaceShadow({ elevation: 'positioned' })]}
    >
      <ScrollArea.Viewport classNames='rounded p-4'>
        <p>{children}</p>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='horizontal'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/ScrollArea',
  component: ScrollArea as any,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: faker.lorem.paragraphs(5),
  },
};

export const NestedScrollAreas: Story = {
  render: () => {
    const columns = Array.from({ length: 3 }).map((_, index) => ({
      id: String(index),
      itemCount: 20,
    }));

    return (
      <div className='p-4 bs-full is-full overflow-hidden'>
        <div className='flex bs-full is-full overflow-hidden border border-sky-500'>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <div className='flex gap-4 p-3 bs-full overflow-hidden'>
                {columns.map((column) => (
                  <div key={column.id} className='flex flex-col gap-1 bs-full overflow-hidden is-[300px]'>
                    <div className='flex shrink-0 p-2 border border-separator'>Column {column.id}</div>
                    <ScrollArea.Expander classNames='border border-rose-500'>
                      <ScrollArea.Root>
                        <ScrollArea.Viewport>
                          <div className='flex flex-col p-3 space-y-2'>
                            {Array.from({ length: column.itemCount }, (_, i) => (
                              <div key={i} className={`p-3 border border-separator rounded-sm`}>
                                Item {i + 1}
                              </div>
                            ))}
                          </div>
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar orientation='vertical'>
                          <ScrollArea.Thumb />
                        </ScrollArea.Scrollbar>
                      </ScrollArea.Root>
                    </ScrollArea.Expander>
                    <div className={`p-2 border border-separator`}>Footer</div>
                  </div>
                ))}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation='horizontal'>
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      </div>
    );
  },
};
