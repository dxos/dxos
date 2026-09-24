//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { IconButton, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { ScrollFollower } from './follow.ts';

/** Fixed so the readout in rows/s is directly checkable against the pixels travelled. */
const ROW_HEIGHT = 48;

type StoryProps = {
  count?: number;
  /** rows/s */
  maxSpeed?: number;
  /** rows/s² */
  acceleration?: number;
  /** rows/s²; defaults to `acceleration` */
  deceleration?: number;
  /** Append an item every `growInterval` ms while following, to test a moving target. */
  grow?: boolean;
  growInterval?: number;
};

/**
 * The scroll mechanism on its own.
 *
 * Deliberately free of messages, items and virtualization: plain rows in a `ScrollArea`, so what is
 * on screen is only the follow — its ramp up, its cruise, and its landing. When the feed's scrolling
 * feels wrong, this is where to tell a follow problem apart from a measurement one.
 */
const DefaultStory = ({
  count = 100,
  maxSpeed,
  acceleration,
  deceleration,
  grow = false,
  growInterval = 300,
}: StoryProps) => {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [extra, setExtra] = useState(0);
  const [running, setRunning] = useState(false);
  const [readout, setReadout] = useState({ top: 0, target: 0, velocity: 0, peak: 0 });

  const items = useMemo(() => Array.from({ length: count + extra }, (_, index) => ({ index })), [count, extra]);

  // Rows are a fixed size here, which is the point: the mechanism is measured against a known
  // geometry so a speed in rows/s means exactly what it says.
  const follower = useMemo(
    () =>
      viewport
        ? new ScrollFollower(viewport, { maxSpeed, acceleration, deceleration, rowHeight: () => ROW_HEIGHT })
        : undefined,
    [viewport, maxSpeed, acceleration, deceleration],
  );
  useEffect(() => () => follower?.cancel(), [follower]);

  const handleToggle = useCallback(() => {
    if (follower?.running) {
      // `running` stays true through the coast; the sampler below clears it once the follow has
      // actually come to rest, so the control reflects the motion rather than the intent.
      follower.stop();
    } else {
      follower?.start();
      setRunning(true);
    }
  }, [follower]);

  const handleTop = useCallback(() => {
    follower?.cancel();
    setRunning(false);
    setExtra(0);
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [follower, viewport]);

  // A moving target: content arriving while the follow is under way is the case a single smooth
  // scroll cannot serve, since each arrival would restart its easing.
  useEffect(() => {
    if (!grow || !running) {
      return;
    }

    const interval = setInterval(() => setExtra((value) => value + 1), growInterval);
    return () => clearInterval(interval);
  }, [grow, running, growInterval]);

  // Sampled rather than pushed: the follower writes `scrollTop` every frame, and re-rendering the
  // list at that rate would measure React instead of the scroll.
  useEffect(() => {
    if (!viewport || !follower) {
      return;
    }

    const timer = setInterval(() => {
      const velocity = Math.round(follower.velocity * 10) / 10;
      setReadout((prev) => ({
        top: Math.round(viewport.scrollTop),
        target: Math.round(viewport.scrollHeight - viewport.clientHeight),
        velocity,
        // Peak is what says whether the ceiling was ever reached; a travel that never cruises reads
        // as abrupt for a reason that has nothing to do with the landing.
        peak: follower.running ? Math.max(prev.peak, velocity) : prev.peak,
      }));
      setRunning(follower.running);
    }, 50);
    return () => clearInterval(timer);
  }, [viewport, follower]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon={running ? 'ph--stop--regular' : 'ph--play--regular'}
            iconOnly
            label={running ? 'Stop' : 'Start'}
            data-testid='follow.toggle'
            onClick={handleToggle}
          />
          <IconButton
            icon='ph--arrow-line-up--regular'
            iconOnly
            label='Top'
            data-testid='follow.top'
            onClick={handleTop}
          />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport data-testid='follow.viewport' ref={setViewport}>
            {items.map(({ index }) => (
              <div
                key={index}
                style={{ height: ROW_HEIGHT }}
                className={mx('flex items-center px-3', index % 2 === 0 && 'bg-input-surface')}
              >
                <span className='text-sm text-description'>{index}</span>
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>

      <Panel.Statusbar>
        <div className='h-6 grid grid-cols-5 items-center gap-4 px-2 text-xs text-description tabular-nums'>
          <span data-testid='follow.items'>{items.length} items</span>
          <span data-testid='follow.position'>
            {readout.top} / {readout.target}
          </span>
          <span data-testid='follow.remaining'>
            {((readout.target - readout.top) / ROW_HEIGHT).toFixed(1)} rows left
          </span>
          <span data-testid='follow.velocity'>
            {readout.velocity} rows/s (peak {readout.peak})
          </span>
          <span className='text-right'>{running ? 'following' : 'idle'}</span>
        </div>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-virtual/follow',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 100 },
};

export default meta;

type Story = StoryObj<StoryProps>;

/** Fixed target: press play and watch it ramp up, cruise, then brake onto the last row. */
export const Default: Story = {};

/** Moving target: rows keep arriving, so the follow should hold its cruise speed rather than stutter. */
export const Growing: Story = {
  args: { grow: true },
};

/** Slower and gentler — the dials, for comparing feel. */
export const Gentle: Story = {
  args: { maxSpeed: 4, acceleration: 8 },
};

/** Brakes harder than it accelerates: a quick pick-up with a long, soft landing. */
export const LateBraking: Story = {
  args: { maxSpeed: 16, acceleration: 40, deceleration: 8 },
};
