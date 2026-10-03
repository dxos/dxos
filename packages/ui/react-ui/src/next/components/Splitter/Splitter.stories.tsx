//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import * as Typography from '../Typography/Typography.tsx';
import * as Splitter from './Splitter.tsx';

type StoryArgs = Pick<
  Splitter.RootProps,
  'orientation' | 'anchor' | 'mode' | 'resizable' | 'defaultSize' | 'minSize' | 'transition'
>;

const Pane = ({ label }: { label: string }) => (
  <div className='grid place-items-center' data-testid={`pane-${label}`}>
    <Typography.Typography>{label}</Typography.Typography>
  </div>
);

/** A controlled splitter, as the deck drives it: the size (rem) is the app's state and the seam reports drags. */
const DefaultStory = ({ defaultSize = 12, ...args }: StoryArgs) => {
  const [size, setSize] = useState(defaultSize);
  return (
    <div className='flex flex-col w-[40rem] h-[24rem] border border-separator'>
      <Splitter.Root {...args} size={size} onSizeChange={setSize}>
        <Splitter.Panel position='start'>
          <Pane label='Start' />
        </Splitter.Panel>
        <Splitter.ResizeTrigger aria-label='Resize' />
        <Splitter.Panel position='end'>
          <Pane label='End' />
        </Splitter.Panel>
      </Splitter.Root>
      <Typography.Typography data-testid='size'>{size.toFixed(2)}rem</Typography.Typography>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Splitter',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-0' }), withTheme()],
  args: { orientation: 'horizontal', anchor: 'start', mode: 'split', resizable: true, defaultSize: 12, minSize: 6 },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    anchor: { control: 'inline-radio', options: ['start', 'end'] },
    mode: { control: 'inline-radio', options: ['start', 'split', 'end'] },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const part = (canvasElement: HTMLElement, name: string) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-scope="splitter"][data-part="${name}"]`);
  if (!element) {
    throw new Error(`No splitter ${name}`);
  }
  return element;
};

const panelsOf = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('[data-scope="splitter"][data-part="panel"]'),
];

/** The anchored pane holds its rem, the seam takes no width, and the keyboard resize round-trips through the size. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const root = part(canvasElement, 'root');
    const trigger = part(canvasElement, 'resize-trigger');
    const panels = panelsOf(canvasElement);
    const widths = () => panels.map((panel) => panel.getBoundingClientRect().width);

    await waitFor(() => expect(Math.round(widths()[0] / rem)).toBe(12));
    await expect(Math.round(widths()[0] + widths()[1])).toBe(Math.round(root.getBoundingClientRect().width));

    // A separator between side-by-side panes is a vertical line.
    await expect(trigger).toHaveAttribute('role', 'separator');
    await expect(trigger).toHaveAttribute('aria-orientation', 'vertical');
    await expect(trigger.getBoundingClientRect().width).toBeCloseTo(7, 0);

    trigger.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvas.getByTestId('size')).not.toHaveTextContent('12.00rem'));
    const reported = () => parseFloat(canvas.getByTestId('size').textContent ?? '');
    await waitFor(() => expect(Math.abs(widths()[0] / rem - reported())).toBeLessThan(0.05));
  },
};

/** `mode` collapses to one pane; a non-resizable splitter renders no seam. */
export const Collapsed: Story = {
  args: { mode: 'start', resizable: false, orientation: 'vertical', transition: 0 },
  play: async ({ canvasElement }) => {
    const root = part(canvasElement, 'root');
    const panels = panelsOf(canvasElement);
    await expect(canvasElement.querySelector('[data-part="resize-trigger"]')).toBeNull();
    await waitFor(() => expect(panels[1].getBoundingClientRect().height).toBe(0));
    await expect(panels[0].getBoundingClientRect().height).toBeCloseTo(root.getBoundingClientRect().height, 0);
  },
};
