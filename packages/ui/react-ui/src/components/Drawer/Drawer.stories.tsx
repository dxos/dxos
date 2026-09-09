//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Drawer, type DrawerRootProps } from './Drawer';

type StoryArgs = Pick<DrawerRootProps, 'side' | 'modal' | 'snapPoints'> & {
  title?: string;
  description?: string;
  /** Render the handle a sheet is dragged by. */
  grabber?: boolean;
  /** Lines of filler content below the fold. */
  filler?: number;
};

/** Filler below the fold, so a snap point short of fully open has something to hide. */
const Filler = ({ lines }: { lines: number }) => (
  <ol className='flex flex-col gap-2 p-4 list-decimal list-inside text-description'>
    {Array.from({ length: lines }, (_, index) => (
      <li key={index}>Line {index + 1}</li>
    ))}
  </ol>
);

const Body = ({ title, description, grabber, filler = 0 }: StoryArgs) => (
  <>
    {grabber && <Drawer.Grabber />}
    {title && <Drawer.Title classNames='pt-4'>{title}</Drawer.Title>}
    {description && <Drawer.Description>{description}</Drawer.Description>}
    <div className='flex flex-col gap-2 p-4'>
      <p>Drag the panel toward its edge to dismiss it, press Escape, or use the button.</p>
      <Drawer.Close asChild>
        <Button variant='primary'>Close</Button>
      </Drawer.Close>
    </div>
    {filler > 0 && <Filler lines={filler} />}
  </>
);

/** A modal drawer nests its content in the scrim; a non-modal one renders the content alone. */
const DefaultStory = ({ side, modal, snapPoints, ...props }: StoryArgs) => (
  <Drawer.Root defaultOpen side={side} modal={modal} snapPoints={snapPoints}>
    <div className='flex items-center justify-center h-full'>
      <Drawer.Trigger asChild>
        <Button>Open</Button>
      </Drawer.Trigger>
    </div>
    {modal ? (
      <Drawer.Overlay>
        <Drawer.Content>
          <Body {...props} />
        </Drawer.Content>
      </Drawer.Overlay>
    ) : (
      <Drawer.Content>
        <Body {...props} />
      </Drawer.Content>
    )}
  </Drawer.Root>
);

const meta = {
  title: 'ui/react-ui-core/components/Drawer',
  component: Drawer.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    side: { control: 'select', options: ['start', 'end', 'top', 'bottom'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    side: 'bottom',
    modal: true,
    title: 'Drawer',
    description: 'A panel that slides in from an edge of the viewport.',
  },
};

export const Side: Story = {
  args: {
    side: 'start',
    modal: true,
    title: 'Navigation',
    description: 'Swipe toward the left edge to dismiss.',
  },
};

/** Rests at two fifths of the viewport first; a drag past that opens it fully. */
export const BottomSheet: Story = {
  args: {
    side: 'bottom',
    modal: true,
    grabber: true,
    filler: 30,
    snapPoints: [0.4, 1],
    title: 'Sheet',
    description: 'Drag the handle up to expand, down to dismiss.',
  },
};

/** The page behind stays interactive and there is no scrim. */
export const NonModal: Story = {
  args: {
    side: 'end',
    modal: false,
    title: 'Inspector',
    description: 'The page behind stays interactive.',
  },
};

/** The trigger opens it, Escape closes it, and closed content leaves the DOM. */
export const TestOpenClose: Story = {
  args: {
    side: 'bottom',
    modal: true,
    title: 'Drawer',
    description: 'A panel that slides in from an edge of the viewport.',
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Drawer' });
    await expect(dialog).toHaveAttribute('data-swipe-direction', 'down');
    await expect(dialog).toHaveAccessibleDescription('A panel that slides in from an edge of the viewport.');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    await body.findByRole('dialog', { name: 'Drawer' });
  },
};

/** Without a `Description`, the machine points `aria-describedby` at nothing. */
export const TestNoDescription: Story = {
  args: {
    side: 'start',
    modal: true,
    title: 'Drawer',
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Drawer' });
    await expect(dialog).not.toHaveAttribute('aria-describedby');
    await expect(dialog).toHaveAttribute('data-swipe-direction', 'left');
  },
};
