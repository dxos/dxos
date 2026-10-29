//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { useClock, useRegistry } from '../../../hooks/index.ts';
import { createClock } from '../../../model/index.ts';
import { TimelinePanel, keyAt } from './TimelinePanel.tsx';

type StoryArgs = { duration: number; fps: number; readonly?: boolean };

/** The bar over a real view clock, as `Canvas.Timeline` drives it, with keys kept in local state. */
const DefaultStory = ({ duration, fps, readonly }: StoryArgs) => {
  const registry = useRegistry();
  const clock = useMemo(() => createClock(), []);
  useClock(clock, { duration });
  const time = useAtomValue(clock.time);
  const playing = useAtomValue(clock.playing);
  const [keys, setKeys] = useState<number[]>([0, 1.5]);
  const [autoKey, setAutoKey] = useState(true);
  return (
    <TimelinePanel
      time={time}
      duration={duration}
      playing={playing}
      fps={fps}
      keys={keys}
      autoKey={autoKey}
      readonly={readonly}
      onPlayingChange={(next) => registry.set(clock.playing, next)}
      onTimeChange={(next) => registry.set(clock.time, next)}
      onAutoKeyChange={setAutoKey}
      onAddKey={() => setKeys((keys) => [...new Set([...keys, time])].sort((left, right) => left - right))}
      onRemoveKey={() => setKeys((keys) => keys.filter((key) => key !== keyAt(keys, time, fps)))}
      onMoveKey={(from, to) =>
        setKeys((keys) =>
          [...new Set(keys.map((key) => (key === from ? to : key)))].sort((left, right) => left - right),
        )
      }
    />
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/panels/TimelinePanel',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: uiTranslations },
  args: { duration: 4, fps: 30 },
  argTypes: {
    duration: { control: { type: 'range', min: 1, max: 20, step: 1 }, description: 'Seconds' },
    fps: { control: { type: 'inline-radio' }, options: [24, 30, 60] },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. The bar shows the time against the duration and a diamond per key.
 * 2. Pressing the middle of the track moves the playhead there, on the frame grid.
 * 3. Add key puts a diamond at the playhead; on a key the same button removes it.
 * 4. Cmd<- and Cmd-> jump between keys; Delete removes the key under the playhead.
 * 5. Play advances the clock; pressing it again pauses.
 */
export const Default: Story = {};

/** The default story, driven: its steps run as a play test. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Time and keys.
    await expect(await canvas.findByTestId('timeline-time')).toHaveTextContent('0.00 / 4.00');
    await expect(canvas.getAllByTestId('timeline-key')).toHaveLength(2);

    // 2. Scrub to the middle.
    const track = canvas.getByTestId('timeline-track');
    const rect = track.getBoundingClientRect();
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: track,
      coords: { clientX: rect.left + rect.width / 2, clientY: rect.top + 4 },
    });
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('2.00 / 4.00'));

    // 3. From the menu: a key at the playhead, deleted and added back; auto-key turns off and on.
    const choose = async (testId: string) => {
      await userEvent.click(canvas.getByTestId('timeline-menu'));
      const item = await within(document.body).findByTestId(testId);
      await waitFor(() => expect(item).toBeVisible());
      // The menu ignores synthetic pointer events on its items, so the item is highlighted and chosen from the keyboard.
      for (let step = 0; step < 4 && !item.hasAttribute('data-highlighted'); step++) {
        await userEvent.keyboard('{ArrowDown}');
      }
      await expect(item).toHaveAttribute('data-highlighted');
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(item).not.toBeVisible());
    };
    await choose('timeline-add-key');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(3));
    await choose('timeline-remove-key');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(2));
    await choose('timeline-add-key');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(3));
    await choose('timeline-auto-key');
    await userEvent.click(canvas.getByTestId('timeline-menu'));
    await expect(await within(document.body).findByTestId('timeline-auto-key')).toHaveAttribute(
      'data-state',
      'unchecked',
    );
    await userEvent.keyboard('{Escape}');

    // 4. Jump between keys from the track, and delete one.
    track.focus();
    await userEvent.keyboard('{Meta>}{ArrowLeft}{/Meta}');
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('1.15 / 4.00'));
    await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}');
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('2.00 / 4.00'));
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(2));

    // 5. A diamond drags along the track: the key moves where it is dropped, and the playhead with it.
    const [first] = canvas.getAllByTestId('timeline-key');
    const from = first.getBoundingClientRect();
    const quarter = rect.left + rect.width / 4;
    await fireEvent.pointerDown(first, { clientX: from.left, clientY: from.top, pointerId: 1 });
    await fireEvent.pointerMove(first, { clientX: quarter, clientY: from.top, pointerId: 1 });
    await fireEvent.pointerUp(first, { clientX: quarter, clientY: from.top, pointerId: 1 });
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('1.00 / 4.00'));
    await waitFor(() =>
      expect(canvas.getAllByTestId('timeline-key').map((key) => key.getAttribute('aria-label'))).toContain(
        'Key at 1.00 s',
      ),
    );

    // 6. From the play button: Cmd with an arrow walks the keys and then reaches the end (or the start), a plain arrow
    // scrubs a frame, Enter keys the playhead once, Delete removes that key and Space plays and pauses.
    const play = canvas.getByTestId('timeline-play');
    play.focus();
    const keyCount = canvas.getAllByTestId('timeline-key').length;
    for (let step = 0; step <= keyCount; step++) {
      await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}');
    }
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('4.00 / 4.00'));
    for (let step = 0; step <= keyCount; step++) {
      await userEvent.keyboard('{Meta>}{ArrowLeft}{/Meta}');
    }
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('0.00 / 4.00'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('0.01 / 4.00'));
    for (let step = 0; step <= keyCount; step++) {
      await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}');
    }
    const count = canvas.getAllByTestId('timeline-key').length;
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(count + 1));
    // Already on a key: Enter adds nothing, and it never presses the button (still paused).
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getAllByTestId('timeline-key')).toHaveLength(count + 1);
    await expect(play).toHaveAccessibleName('Play');
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(count));
    await userEvent.keyboard('{Meta>}{ArrowLeft}{/Meta}');
    for (let step = 0; step <= keyCount; step++) {
      await userEvent.keyboard('{Meta>}{ArrowLeft}{/Meta}');
    }
    await userEvent.keyboard(' ');
    await waitFor(() => expect(play).toHaveAccessibleName('Pause'));
    await userEvent.keyboard(' ');
    await waitFor(() => expect(play).toHaveAccessibleName('Play'));

    // 7. Play, then pause.
    await userEvent.click(canvas.getByTestId('timeline-play'));
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).not.toHaveTextContent(/^2\.00/), {
      timeout: 5_000,
    });
    await userEvent.click(canvas.getByTestId('timeline-play'));
    await expect(canvas.getByTestId('timeline-play')).toHaveAccessibleName('Play');
  },
};

/** Read-only: play and scrub stay, the key and auto-key menu goes. */
export const Readonly: Story = {
  args: { readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('timeline-play')).toBeInTheDocument();
    await expect(canvas.queryByTestId('timeline-menu')).toBeNull();
  },
};
