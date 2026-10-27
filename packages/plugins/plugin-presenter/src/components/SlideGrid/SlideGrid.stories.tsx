//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type SlideSource } from '#deck';
import { translations } from '#translations';

import { SlideGrid, type SlideGridProps } from './SlideGrid.tsx';

const CONTENT = [
  '# Title\n\nA presentation',
  '---\nlayout: two-cols\n---\n# Left\n\n- One\n- Two\n\n::right::\n\n# Right\n\n- Three',
  '---\nlayout: center\n---\n# Center',
  '---\nlayout: quote\n---\n> A quotation.',
  '---\nlayout: fact\n---\n# 100%\n\nA fact',
  '# Lists\n\n- One\n- Two\n- Three',
  '```ts\nconst x = 1;\n```',
  '# Questions?',
];

type StoryProps = Pick<SlideGridProps, 'onPresent'>;

const DefaultStory = ({ onPresent }: StoryProps) => {
  const [contents, setContents] = useState(CONTENT);
  const [index, setIndex] = useState(0);
  const slides = contents.map((content): SlideSource => ({ kind: 'markdown', id: content, content }));
  return (
    <SlideGrid
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      onPresent={onPresent}
      onMove={(from, to) =>
        setContents((current) => {
          const next = [...current];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        })
      }
    />
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/SlideGrid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: 'flex' })],
  args: { onPresent: fn() },
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Every slide as a fully revealed thumbnail; the first is selected, arrow keys move the selection, the tiles can be
 * dragged to reorder them, and a double-click presents from a slide.
 */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const first = await canvas.findByTestId('presenter.slide-grid.0', undefined, { timeout: 10_000 });
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('draggable', 'true');
    await userEvent.click(canvas.getByTestId('presenter.slide-grid.2'));
    await waitFor(() => expect(canvas.getByTestId('presenter.slide-grid.2')).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvas.getByTestId('presenter.slide-grid.3')).toHaveAttribute('aria-selected', 'true'));
    await userEvent.dblClick(canvas.getByTestId('presenter.slide-grid.1'));
    await expect(args.onPresent).toHaveBeenCalledWith(1);
  },
};
