//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Panel } from '../Panel';
import { Splitter } from '../Splitter';
import { Toolbar } from '../Toolbar';
import { Drawer, type DrawerRootProps } from './Drawer';

type StoryArgs = Pick<DrawerRootProps, 'side' | 'modal' | 'snapPoints'> & {
  title?: string;
  description?: string;
  /** Render the handle a sheet is dragged by. */
  grabber?: boolean;
  /** Lines of filler content below the fold. */
  filler?: number;
};

/** Extends `CSSProperties` so the custom property satisfies the style prop without a cast. */
type DrawerSizeStyle = CSSProperties & { '--dx-drawer-size': string };

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
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Drawer.Trigger asChild>
            <Button>Open</Button>
          </Drawer.Trigger>
        </Toolbar.Root>
      </Panel.Toolbar>
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
    </Panel.Root>
  </Drawer.Root>
);

/**
 * Two pushed drawers flank the main panel, which yields the room they take: the three are flex
 * siblings, and a drag toward either edge narrows that drawer with the main panel following in step.
 */
const PushStory = () => {
  const [start, setStart] = useState(true);
  const [end, setEnd] = useState(true);
  const [inspectorSize, setInspectorSize] = useState(24);
  // The drawer fills the pane the seam gives it; its children anchor to that length, not to the pane's
  // percentage, so a collapsing pane clips them instead of reflowing them.
  const inspectorStyle: DrawerSizeStyle = { '--dx-drawer-size': `${inspectorSize}rem` };
  return (
    <div className='flex dx-fill'>
      <Drawer.Root open={start} onOpenChange={setStart} side='start' push>
        <Drawer.Content>
          <Toolbar.Root>
            <Drawer.Title classNames='grow px-2'>Navigation</Drawer.Title>
            <Toolbar.IconButton
              icon='ph--sidebar--regular'
              iconOnly
              label='Close navigation'
              onClick={() => setStart(false)}
            />
          </Toolbar.Root>
          <Drawer.Description>Pushes the main panel right. Drag toward the left edge to dismiss.</Drawer.Description>
          <Filler lines={12} />
        </Drawer.Content>
      </Drawer.Root>
      {/* The seam owns the inspector's width and animates its collapse; the drawer fills the pane it is given. */}
      <Splitter.Root
        orientation='horizontal'
        anchor='end'
        size={inspectorSize}
        onSizeChange={setInspectorSize}
        minSize={12}
        resizable
        mode={end ? 'split' : 'start'}
        classNames='dx-grow'
      >
        <Splitter.Panel position='start'>
          <Panel.Root as='main' classNames='dx-base-surface' data-testid='drawer.main'>
            <Panel.Toolbar asChild>
              <Toolbar.Root>
                {!start && (
                  <Toolbar.IconButton
                    icon='ph--sidebar-simple--regular'
                    iconOnly
                    label='Toggle navigation'
                    onClick={() => setStart((open) => !open)}
                  />
                )}
                <Toolbar.Separator />
                {!end && (
                  <Toolbar.IconButton
                    icon='ph--square-split-horizontal--regular'
                    iconOnly
                    label='Toggle inspector'
                    classNames='[&_svg]:-scale-x-100'
                    onClick={() => setEnd((open) => !open)}
                  />
                )}
              </Toolbar.Root>
            </Panel.Toolbar>
            <Panel.Content classNames='flex items-center justify-center'>Main</Panel.Content>
            <Panel.Statusbar asChild>
              <Toolbar.Root classNames='justify-between'>
                <span className='px-2 text-description'>Ready</span>
                <Toolbar.IconButton variant='ghost' icon='ph--info--regular' iconOnly label='Status' />
              </Toolbar.Root>
            </Panel.Statusbar>
          </Panel.Root>
        </Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel position='end'>
          <Drawer.Root open={end} onOpenChange={setEnd} side='end' push>
            <Drawer.Content draggable={false} style={inspectorStyle}>
              <Toolbar.Root>
                <Drawer.Title classNames='grow px-2'>Inspector</Drawer.Title>
                <Toolbar.IconButton
                  icon='ph--x--regular'
                  iconOnly
                  label='Close inspector'
                  onClick={() => setEnd(false)}
                />
              </Toolbar.Root>
              <Drawer.Description>
                Pushes the main panel left. Drag toward the right edge to dismiss.
              </Drawer.Description>
              <Filler lines={12} />
            </Drawer.Content>
          </Drawer.Root>
        </Splitter.Panel>
      </Splitter.Root>
    </div>
  );
};

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

/** A start and an end drawer, both pushing, with the main panel between them. */
export const Push: Story = {
  render: () => <PushStory />,
};

/** Closing a pushed drawer hands its width back to the main panel; the drawers are the page's own layout. */
export const TestPush: Story = {
  render: () => <PushStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const main = canvas.getByRole('main');
    const dialogs = await canvas.findAllByRole('dialog');
    await expect(dialogs).toHaveLength(2);
    await expect(dialogs[0]).toHaveAttribute('data-push');
    // The two panels flank the main one in document order, so nothing overlays anything.
    await waitFor(async () => {
      const [start, end] = dialogs.map((dialog) => dialog.getBoundingClientRect());
      const middle = main.getBoundingClientRect();
      await expect(start.right).toBeLessThanOrEqual(middle.left + 1);
      await expect(middle.right).toBeLessThanOrEqual(end.left + 1);
    });
    // Measure at rest: both panels slide in from zero width on mount.
    await settle(dialogs);
    const before = main.getBoundingClientRect().width;
    const navigation = dialogs[0].getBoundingClientRect().width;

    await userEvent.click(canvas.getByRole('button', { name: 'Close navigation' }));
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('dialog')).toHaveLength(1);
      await expect(Math.round(main.getBoundingClientRect().width)).toBe(Math.round(before + navigation));
    });
  },
};

const settle = async (elements: Element[]) => {
  await waitFor(async () => {
    await expect(elements.every((element) => element.getAnimations().length === 0)).toBe(true);
  });
};

/** Samples `read` every frame until `until` holds or the budget runs out. */
const sample = async <T,>(read: () => T, until: () => boolean, budget = 600): Promise<T[]> => {
  const samples: T[] = [];
  const started = performance.now();
  while (!until() && performance.now() - started < budget) {
    samples.push(read());
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return samples;
};

/**
 * Closing one side leaves the other alone: the seam holds the inspector's width frame by frame while
 * the navigation slides out, and the inspector's children keep their width while its pane collapses.
 */
export const TestPushCollapse: Story = {
  render: () => <PushStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialogs = await canvas.findAllByRole('dialog');
    await settle(dialogs);
    const panes = [...canvasElement.querySelectorAll<HTMLElement>('[data-scope="splitter"][data-part="panel"]')];
    const endPane = panes[1];
    const inspector = dialogs[1];
    const inspectorWidth = Math.round(endPane.getBoundingClientRect().width);

    // The seam does not jiggle: the end pane's width never moves while the navigation closes.
    await userEvent.click(canvas.getByRole('button', { name: 'Close navigation' }));
    const seam = await sample(
      () => Math.round(endPane.getBoundingClientRect().width),
      () => !dialogs[0].isConnected,
    );
    await expect(seam.length).toBeGreaterThan(3);
    await expect(seam.every((width) => width === inspectorWidth)).toBe(true);

    // The inspector's children hold their width while the pane collapses around them.
    const children = [...inspector.children];
    await userEvent.click(canvas.getByRole('button', { name: 'Close inspector' }));
    const collapse = await sample(
      () => ({
        pane: Math.round(endPane.getBoundingClientRect().width),
        children: children.map((child) => Math.round(child.getBoundingClientRect().width)),
      }),
      () => !inspector.isConnected,
    );
    await expect(collapse.length).toBeGreaterThan(3);
    await expect(collapse.some(({ pane }) => pane > 0 && pane < inspectorWidth)).toBe(true);
    await expect(collapse.every(({ children }) => children.every((width) => width === inspectorWidth))).toBe(true);
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
