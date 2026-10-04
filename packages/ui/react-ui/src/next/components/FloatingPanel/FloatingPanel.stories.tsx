//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { GEOMETRY, byTestId } from '../../testing.ts';
import * as Button from '../Button/Button.tsx';
import * as Container from '../Container/Container.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as FloatingPanel from './FloatingPanel.tsx';

random.seed(7);

const LINES = Array.from({ length: 40 }, () => random.lorem.sentence());

type StoryArgs = Pick<FloatingPanel.RootProps, 'resizable' | 'draggable'>;

/** A button opening a log window that folds, maximizes, restores and closes; its body scrolls in a ScrollArea. */
const DefaultStory = (args: StoryArgs) => (
  <FloatingPanel.Root
    {...args}
    defaultSize={{ width: 384, height: 256 }}
    defaultPosition={{ x: 32, y: 96 }}
    minSize={{ width: 240, height: 160 }}
    closeOnEscape
  >
    <FloatingPanel.Trigger asChild>
      <Button.Button data-testid='panel.trigger'>Open log</Button.Button>
    </FloatingPanel.Trigger>
    <FloatingPanel.Content data-testid='panel'>
      <FloatingPanel.Header data-testid='panel.header'>
        <FloatingPanel.DragTrigger>
          <FloatingPanel.Title>Log</FloatingPanel.Title>
        </FloatingPanel.DragTrigger>
        <FloatingPanel.Control>
          <FloatingPanel.StageTrigger stage='minimized' />
          <FloatingPanel.StageTrigger stage='maximized' />
          <FloatingPanel.StageTrigger stage='default' />
          <FloatingPanel.CloseTrigger />
        </FloatingPanel.Control>
      </FloatingPanel.Header>
      <FloatingPanel.Body data-testid='panel.body'>
        <ScrollArea.Root classNames='h-full'>
          <ScrollArea.Viewport asChild>
            <Container.Container gutter='inset'>
              {LINES.map((line, index) => (
                <Typography.Text key={index}>{line}</Typography.Text>
              ))}
            </Container.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </FloatingPanel.Body>
    </FloatingPanel.Content>
  </FloatingPanel.Root>
);

const meta = {
  title: 'ui/react-ui-core/components/FloatingPanel',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4' }), withTheme()],
  args: { resizable: true, draggable: true },
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The trigger opens a `dialog` named by its title at `level='raised'`, placed and sized from the defaults with a resize
 * handle on every edge and corner. Minimize folds it to its block-tall header and hides the body; restore and maximize
 * swap with it; the close button and Escape close it. The story ends open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = byTestId(canvasElement, 'panel.trigger');

    await expect(body.queryByTestId('panel')).toBeNull();
    await userEvent.click(trigger);
    let panel = await body.findByRole('dialog', { name: 'Log' });
    await expect(panel).toBe(body.getByTestId('panel'));
    await expect(panel).toHaveAttribute('data-surface', 'raised');
    await expect(panel).toHaveAttribute('data-size', 'md');
    await expect(getComputedStyle(panel).getPropertyValue('--dx-level').trim()).toBe('3');
    await waitFor(async () => {
      const rect = panel.getBoundingClientRect();
      await expect(rect.width).toBeCloseTo(384, 0);
      await expect(rect.height).toBeCloseTo(256, 0);
      await expect(rect.left).toBeCloseTo(32, 0);
      await expect(rect.top).toBeCloseTo(96, 0);
    });
    await expect(panel.querySelectorAll('[data-part="resize-trigger"]')).toHaveLength(8);
    // A block row and its 1px separator.
    await expect(body.getByTestId('panel.header').getBoundingClientRect().height).toBeCloseTo(GEOMETRY.md.block + 1, 0);
    const viewport = body.getByTestId('panel.body').querySelector<HTMLElement>('.dx-scroll-viewport');
    await waitFor(() => expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(true));

    // Restore is hidden until the panel is staged; minimize folds it to the header.
    const control = within(panel);
    await expect(control.queryByRole('button', { name: 'Restore' })).toBeNull();
    await userEvent.click(control.getByRole('button', { name: 'Minimize' }));
    await waitFor(() => expect(panel).toHaveAttribute('data-staged'));
    await waitFor(() => expect(body.getByTestId('panel.body')).not.toBeVisible());
    await waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(GEOMETRY.md.block + 3));
    await userEvent.click(control.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(panel).not.toHaveAttribute('data-staged'));
    await waitFor(() => expect(panel.getBoundingClientRect().height).toBeCloseTo(256, 0));

    await userEvent.click(control.getByRole('button', { name: 'Maximize' }));
    await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(384));
    await userEvent.click(control.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(panel.getBoundingClientRect().width).toBeCloseTo(384, 0));

    await userEvent.click(control.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(body.queryByTestId('panel')).toBeNull());

    await userEvent.click(trigger);
    panel = await body.findByRole('dialog', { name: 'Log' });
    panel.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('panel')).toBeNull());

    await userEvent.click(trigger);
    await body.findByRole('dialog', { name: 'Log' });
  },
};
