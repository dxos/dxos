//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import type * as Tour from '@dxos/plugin-support/Tour';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Button, IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { WelcomeTour } from './WelcomeTour.tsx';

const steps: Tour.Step[] = [
  {
    target: '[data-testid="story.add"]',
    title: 'Creating content',
    description: 'Press (+) to add new content.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="story.search"]',
    title: 'Search',
    description: 'Find what you made.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="story.menu"]',
    title: 'Menu',
    description: 'Everything else.',
    placement: 'bottom-end',
  },
];

/** A toolbar with three targets; the tour is controlled by the Start button, as by the help state in the app. */
const DefaultStory = () => {
  const [running, setRunning] = useState(false);
  return (
    <Panel.Root classNames='dx-base-surface'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--plus--regular' iconOnly label='Add' data-testid='story.add' />
          <IconButton icon='ph--magnifying-glass--regular' iconOnly label='Search' data-testid='story.search' />
          <Toolbar.Separator variant='gap' />
          <IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' data-testid='story.menu' />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid place-items-center'>
        <Button onClick={() => setRunning(true)} data-testid='story.start'>
          Start tour
        </Button>
      </Panel.Content>
      <WelcomeTour steps={steps} running={running} onRunningChanged={setRunning} />
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-support/components/WelcomeTour',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // `useLayout` (the dialog pause) needs a PluginManager providing AppCapabilities.Layout.
    withPluginManager({ plugins: [...corePlugins(), StorybookPlugin.make({})] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const card = () => document.querySelector<HTMLElement>('[data-testid="helpPlugin.tooltip"]');

// The plugin manager activates before the story mounts, outlasting the default `findBy*` timeout.
const MOUNT_TIMEOUT = { timeout: 15_000 };

/** The card walks the steps by its own buttons, numbered as the e2e suite expects, and leaves on Done. */
export const TestWalkthrough: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = await canvas.findByTestId('story.start', {}, MOUNT_TIMEOUT);
    await expect(card()).toBeNull();
    await userEvent.click(start);
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));
    await expect(canvas.getByTestId('story.add')).toHaveAttribute('data-tour-highlighted');
    await expect(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.back')).toHaveClass(
      'invisible',
    );

    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.next'));
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '2'));
    await expect(canvas.getByTestId('story.search')).toHaveAttribute('data-tour-highlighted');

    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.back'));
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.next'));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.next'));
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '3'));

    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.finish'));
    await waitFor(() => expect(card()).toBeNull());
    await expect(canvas.getByTestId('story.menu')).not.toHaveAttribute('data-tour-highlighted');
    // Ending the tour reports back through `onRunningChanged`; starting again begins at the first step.
    await userEvent.click(start);
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));
  },
};

/** The close button ends the tour. */
export const TestClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('story.start', {}, MOUNT_TIMEOUT));
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.close'));
    await waitFor(() => expect(card()).toBeNull());
  },
};

const laterSteps: Tour.Step[] = [
  {
    target: '[data-testid="story.menu"]',
    title: 'Menu',
    description: 'A different tour entirely.',
    placement: 'bottom-end',
  },
];

/** Mounts with no steps and receives them later, as a registered tour's loader delivers them. */
const LateStepsStory = () => {
  const [current, setCurrent] = useState<Tour.Step[]>([]);
  const [running, setRunning] = useState(false);
  const load = (next: Tour.Step[]) => {
    setCurrent(next);
    setRunning(true);
  };

  return (
    <Panel.Root classNames='dx-base-surface'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--plus--regular' iconOnly label='Add' data-testid='story.add' />
          <IconButton icon='ph--magnifying-glass--regular' iconOnly label='Search' data-testid='story.search' />
          <Toolbar.Separator variant='gap' />
          <IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' data-testid='story.menu' />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid place-items-center gap-2'>
        <Button onClick={() => load(steps)} data-testid='story.startFirst'>
          Start first tour
        </Button>
        <Button onClick={() => load(laterSteps)} data-testid='story.startSecond'>
          Start second tour
        </Button>
      </Panel.Content>
      <WelcomeTour steps={current} running={running && current.length > 0} onRunningChanged={setRunning} />
    </Panel.Root>
  );
};

const title = () => document.querySelector<HTMLElement>('[data-testid="helpPlugin.tooltip.title"]');

/**
 * Steps that arrive after mount reach the card, and a second tour replaces the first rather than
 * replaying it.
 */
export const TestLateSteps: Story = {
  render: LateStepsStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = await canvas.findByTestId('story.startFirst', {}, MOUNT_TIMEOUT);
    await expect(card()).toBeNull();

    await userEvent.click(first);
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));
    await waitFor(() => expect(title()).toHaveTextContent('Creating content'));

    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.close'));
    await waitFor(() => expect(card()).toBeNull());

    await userEvent.click(canvas.getByTestId('story.startSecond'));
    await waitFor(() => expect(title()).toHaveTextContent('Menu'));
  },
};

/** A step whose target is never rendered ends the tour where it stands. */
export const TestMissingTarget: Story = {
  render: () => {
    const [running, setRunning] = useState(false);
    const withMissing: Tour.Step[] = [
      steps[0],
      { target: '[data-testid="story.absent"]', title: 'Missing', description: 'Never rendered.' },
    ];
    return (
      <Panel.Root classNames='dx-base-surface'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton icon='ph--plus--regular' iconOnly label='Add' data-testid='story.add' />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='grid place-items-center'>
          <Button onClick={() => setRunning(true)} data-testid='story.start'>
            Start tour
          </Button>
        </Panel.Content>
        <WelcomeTour steps={withMissing} running={running} onRunningChanged={setRunning} />
      </Panel.Root>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('story.start', {}, MOUNT_TIMEOUT));
    await waitFor(() => expect(card()).toHaveAttribute('data-step', '1'));

    await userEvent.click(within(canvasElement.ownerDocument.body).getByTestId('helpPlugin.tooltip.next'));
    await waitFor(() => expect(card()).toBeNull());
  },
};
