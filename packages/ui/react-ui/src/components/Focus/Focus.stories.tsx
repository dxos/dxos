//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { type ThemedClassName } from '../../util';
import { mx } from '@dxos/ui-theme';

import { Focus } from './Focus';

// TODO(burdon): Create multi-level story (matrix).
// TODO(burdon): Use tabster uniformly (remove custom ArrowUp/ArrowDown handlers).

type Item = { id: string; label: string };

const ITEMS: Item[] = [
  { id: '1', label: 'Item 1' },
  { id: '2', label: 'Item 2' },
  { id: '3', label: 'Item 3' },
  { id: '4', label: 'Item 4' },
  { id: '5', label: 'Item 5' },
];

const Container = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div className='dx-container grid grid-cols-[1fr_2fr_1fr] '>
      <div className='border-e border-separator'></div>
      <div className='dx-expander grid grid-rows-[1fr_2fr_1fr]'>
        <div className='border-b border-separator' />
        <div className={mx('h-full flex flex-col gap-2', classNames)}>{children}</div>
        <div className='border-t border-separator' />
      </div>
      <div className='border-s border-separator'></div>
    </div>
  );
};

const Text = ({ children }: PropsWithChildren) => {
  return <p className='p-1 text-sm text-subdued'>{children}</p>;
};

//
// Default (vertical list)
//

const DefaultStory = () => {
  const [current, setCurrent] = useState<string | undefined>('1');

  return (
    <Container>
      <Text>Tab into the group, then use arrow keys to navigate. Press Enter to select.</Text>
      <Focus.Group classNames='h-full'>
        {ITEMS.map((item) => (
          <Focus.Item
            key={item.id}
            current={current === item.id}
            onCurrentChange={() => setCurrent(item.id)}
            className='flex items-center gap-3 px-3 py-2 aria-current:bg-neutral-75 dark:aria-current:bg-neutral-800'
          >
            <span className='size-2 bg-primary-500 opacity-0 aria-[current]:opacity-100' />
            <span>{item.label}</span>
          </Focus.Item>
        ))}
      </Focus.Group>
      <Text>Selected: {current ?? 'none'}</Text>
    </Container>
  );
};

//
// Horizontal group
//

const HorizontalStory = () => {
  const [current, setCurrent] = useState<string | undefined>();

  return (
    <Container>
      <Text>Horizontal arrow-key navigation between cards.</Text>
      <Focus.Group classNames='h-full flex flex-row gap-2 items-center justify-center' orientation='horizontal'>
        {ITEMS.map((item) => (
          <Focus.Item
            key={item.id}
            current={current === item.id}
            onCurrentChange={() => setCurrent(item.id)}
            className='flex flex-col items-center justify-center w-20 h-20 border border-separator aria-current:border-primary-500 aria-current:bg-primary-50 dark:aria-current:bg-primary-900/20 cursor-pointer'
          >
            <span className='text-xs mt-1'>{item.label}</span>
          </Focus.Item>
        ))}
      </Focus.Group>
      <Text>Selected: {current ?? 'none'}</Text>
    </Container>
  );
};

//
// Error state
//

const ErrorStory = () => {
  const [current, setCurrent] = useState<string | undefined>();

  return (
    <Container>
      <Text>Focus.Group with an error state applied.</Text>
      <Focus.Group classNames='h-full' data-focus-state='error'>
        {ITEMS.slice(0, 3).map((item) => (
          <Focus.Item
            key={item.id}
            current={current === item.id}
            onCurrentChange={() => setCurrent(item.id)}
            className='flex items-center gap-3 px-3 py-2 aria-current:bg-neutral-75 dark:aria-current:bg-neutral-800'
          >
            <span>{item.label}</span>
          </Focus.Item>
        ))}
      </Focus.Group>
    </Container>
  );
};

//
// asChild (slot) usage
//

const AsChildStory = () => {
  const [current, setCurrent] = useState<string | undefined>();

  return (
    <Container>
      <Text>Focus.Item rendered as a custom element via asChild.</Text>
      <Focus.Group classNames='h-full'>
        {ITEMS.slice(0, 3).map((item) => (
          <Focus.Item key={item.id} asChild current={current === item.id} onCurrentChange={() => setCurrent(item.id)}>
            <button className='flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-75 dark:hover:bg-neutral-800 aria-current:bg-primary-50 dark:aria-current:bg-primary-900/20 aria-current:text-primary-600'>
              <span>{item.label}</span>
            </button>
          </Focus.Item>
        ))}
      </Focus.Group>
    </Container>
  );
};

//
// Meta
//

const meta: Meta = {
  title: 'ui/react-ui-core/components/Focus',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Horizontal: Story = {
  render: HorizontalStory,
};

export const ErrorState: Story = {
  render: ErrorStory,
};

export const AsChild: Story = {
  render: AsChildStory,
};
