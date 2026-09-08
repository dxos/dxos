//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentPropsWithoutRef, forwardRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { ScrollArea } from '../ScrollArea';
import { Toolbar } from '../Toolbar';
import { Splitter, type SplitterMode, type SplitterRootProps } from './Splitter';

const PanelContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { label: string }>(
  ({ label, ...props }, forwardedRef) => (
    <Panel.Root {...props} ref={forwardedRef}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>{label}</Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className='p-1'>
                {label}-{i}
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  ),
);

const Panes = () => (
  <>
    <Splitter.Panel position='start'>
      <PanelContent label='A' />
    </Splitter.Panel>
    <Splitter.Handle />
    <Splitter.Panel position='end'>
      <PanelContent label='B' />
    </Splitter.Panel>
  </>
);

// Renders the splitter with no surrounding chrome (Panel.Root keeps the height chain without a toolbar).
const BasicStory = (args: SplitterRootProps) => (
  <Panel.Root>
    <Panel.Content asChild>
      <Splitter.Root {...args}>
        <Panes />
      </Splitter.Root>
    </Panel.Content>
  </Panel.Root>
);

// Toolbar drives the animated collapse via `mode`.
const ToolbarStory = (args: SplitterRootProps) => {
  const [mode, setMode] = useState<SplitterMode>(args.mode ?? 'split');
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setMode('start')}>A</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('split')}>A+B</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('end')}>B</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Splitter.Root {...args} mode={mode}>
          <Panes />
        </Splitter.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * Drives a controlled splitter, as the deck does: the size is the app's state and the seam only
 * reports where it was dragged to. The readout is in rem, which is what the app stores.
 */
const ControlledStory = (args: SplitterRootProps) => {
  const [size, setSize] = useState(args.defaultSize ?? 20);
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <Splitter.Root {...args} size={size} onSizeChange={setSize}>
          <Panes />
        </Splitter.Root>
      </Panel.Content>
      <Panel.Statusbar>
        <span data-testid='splitter.size'>{size.toFixed(2)}rem</span>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta: Meta<SplitterRootProps> = {
  title: 'ui/react-ui-core/components/Splitter',
  component: Splitter.Root,
  render: BasicStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SplitterRootProps>;

export const VerticalStart: Story = {
  args: {
    orientation: 'vertical',
    anchor: 'start',
    resizable: true,
    defaultSize: 20,
    minSize: 6,
  },
};

export const VerticalEnd: Story = {
  args: {
    orientation: 'vertical',
    anchor: 'end',
    resizable: true,
    defaultSize: 20,
    minSize: 6,
  },
};

export const VerticalAnimated: Story = {
  render: ToolbarStory,
  args: {
    orientation: 'vertical',
    transition: 250,
  },
};

export const HorizontalStart: Story = {
  args: {
    orientation: 'horizontal',
    anchor: 'start',
    resizable: true,
    defaultSize: 30,
    minSize: 6,
  },
};

export const HorizontalEnd: Story = {
  args: {
    orientation: 'horizontal',
    anchor: 'end',
    resizable: true,
    defaultSize: 30,
    minSize: 6,
  },
};

export const HorizontalAnimated: Story = {
  render: ToolbarStory,
  args: {
    orientation: 'horizontal',
    transition: 250,
  },
};

export const Controlled: Story = {
  render: ControlledStory,
  args: {
    orientation: 'horizontal',
    anchor: 'start',
    resizable: true,
    defaultSize: 30,
    minSize: 6,
  },
};

export const Test: Story = {
  render: ControlledStory,
  args: {
    orientation: 'horizontal',
    anchor: 'start',
    resizable: true,
    defaultSize: 30,
    minSize: 6,
  },
  // The seam speaks percentages internally and rem to the app; what this checks is that the two
  // agree, and that the seam takes no width of its own — the panes have to meet at it exactly.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const query = <T extends HTMLElement>(part: string): T => {
      const element = canvasElement.querySelector<T>(`[data-scope="splitter"][data-part="${part}"]`);
      if (!element) {
        throw new Error(`No splitter ${part}`);
      }
      return element;
    };

    const root = query('root');
    const panels = [...canvasElement.querySelectorAll('[data-scope="splitter"][data-part="panel"]')];
    await expect(panels).toHaveLength(2);
    const widths = () => panels.map((panel) => panel.getBoundingClientRect().width);
    const reported = () => parseFloat(canvas.getByTestId('splitter.size').textContent ?? '');

    await waitFor(async () => expect(Math.round(widths()[0] / rem)).toEqual(30));
    // The handle straddles the seam rather than taking a slice out of it.
    await expect(Math.round(widths()[0] + widths()[1])).toEqual(Math.round(root.getBoundingClientRect().width));
    await expect(canvas.getByTestId('splitter.size')).toHaveTextContent('30.00rem');

    // The keyboard drives the seam, and what it reports round-trips back through the controlled size.
    query<HTMLElement>('resize-trigger').focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(async () => expect(canvas.getByTestId('splitter.size')).not.toHaveTextContent('30.00rem'));
    await waitFor(async () => expect(Math.abs(widths()[0] / rem - reported())).toBeLessThan(0.05));
  },
};
