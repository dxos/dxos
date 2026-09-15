//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FramePreview } from '../FramePreview/index.ts';
import { FrameStack } from './FrameStack.tsx';

type Item = { id: string; name: string; src?: string };

const ITEMS: Item[] = [
  { id: 'a', name: 'Establishing shot', src: 'https://picsum.photos/seed/a/640/360' },
  { id: 'b', name: 'The reveal' },
  { id: 'c', name: 'Closing', src: 'https://picsum.photos/seed/c/640/360' },
];

const DefaultStory = () => {
  const [items, setItems] = useState(ITEMS);
  const [selectedId, setSelectedId] = useState<string | undefined>('a');
  return (
    <div className='w-(--dx-nav-sidebar-size) h-full overflow-auto border-e border-subdued-separator'>
      <FrameStack
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={(from, to) =>
          setItems((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          })
        }
      >
        {(item, index) => <FramePreview index={index} name={item.name} src={item.src} contentType='image/jpeg' />}
      </FrameStack>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-studio/components/FrameStack',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Clicking a preview selects its frame; the placeholder row is selectable like any other. The
 * arrows move between frames and Enter picks one — react-ui-list's listbox grammar.
 */
export const TestSelect: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const reveal = await canvas.findByText('Frame 2');
    await userEvent.click(reveal);
    const row = reveal.closest('[aria-selected]');
    await expect(row).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowDown}{Enter}');
    const closing = await canvas.findByText('Closing');
    await expect(closing.closest('[aria-selected]')).toHaveAttribute('aria-selected', 'true');
    await expect(row).toHaveAttribute('aria-selected', 'false');
  },
};
