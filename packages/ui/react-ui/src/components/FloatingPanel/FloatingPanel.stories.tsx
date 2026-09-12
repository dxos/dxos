//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { translations } from '#translations';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { ScrollArea } from '../ScrollArea';
import { FloatingPanel, type FloatingPanelPoint, type FloatingPanelSize } from './FloatingPanel.tsx';

const paragraphs = Array.from({ length: 4 }, () => random.lorem.paragraph(3));

type StoryArgs = {
  draggable?: boolean;
  resizable?: boolean;
  persistRect?: boolean;
};

/**
 * A window the reader opens from a button, drags by its header, resizes from any edge, folds to its
 * title bar or fills the viewport, and closes; where it was left is reported so a host can keep it.
 */
const DefaultStory = ({ draggable = true, resizable = true, persistRect = true }: StoryArgs) => {
  const [position, setPosition] = useState<FloatingPanelPoint>();
  const [size, setSize] = useState<FloatingPanelSize>();

  return (
    <div className='flex flex-col gap-2 items-start'>
      <FloatingPanel.Root
        defaultSize={{ width: 480, height: 320 }}
        minSize={{ width: 240, height: 160 }}
        draggable={draggable}
        resizable={resizable}
        persistRect={persistRect}
        onPositionChangeEnd={setPosition}
        onSizeChangeEnd={setSize}
      >
        <FloatingPanel.Trigger asChild>
          <Button>Open panel</Button>
        </FloatingPanel.Trigger>
        <FloatingPanel.Portal>
          <FloatingPanel.Content>
            <FloatingPanel.Header>
              <FloatingPanel.DragTrigger>
                <FloatingPanel.Title>Floating panel</FloatingPanel.Title>
              </FloatingPanel.DragTrigger>
              <FloatingPanel.Control>
                <FloatingPanel.StageTrigger stage='minimized' />
                <FloatingPanel.StageTrigger stage='maximized' />
                <FloatingPanel.StageTrigger stage='default' />
                <FloatingPanel.CloseTrigger />
              </FloatingPanel.Control>
            </FloatingPanel.Header>
            <FloatingPanel.Body>
              <ScrollArea.Root>
                <ScrollArea.Viewport classNames='text-sm'>
                  {paragraphs.map((text, index) => (
                    <p key={index} className='px-2 mb-2'>
                      {text}
                    </p>
                  ))}
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </FloatingPanel.Body>
            <FloatingPanel.Resizers />
          </FloatingPanel.Content>
        </FloatingPanel.Portal>
      </FloatingPanel.Root>
      <div className='text-xs text-description' data-testid='rect'>
        {position && `at ${Math.round(position.x)},${Math.round(position.y)}`}
        {size && ` size ${Math.round(size.width)}×${Math.round(size.height)}`}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/FloatingPanel',
  component: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
  args: { draggable: true, resizable: true, persistRect: true },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open panel' }));
    // Portaled to the body, so the dialog is looked up on the document.
    const body = within(document.body);
    const dialog = await body.findByRole('dialog', { name: 'Floating panel' });
    await expect(dialog).toHaveAttribute('data-state', 'open');

    // Fold to the title bar, then restore.
    await userEvent.click(body.getByRole('button', { name: 'Minimize' }));
    await waitFor(() => expect(dialog).toHaveAttribute('data-minimized'));
    await userEvent.click(body.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('data-minimized'));

    await userEvent.click(body.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

export const Fixed: Story = {
  args: { draggable: false, resizable: false },
};
