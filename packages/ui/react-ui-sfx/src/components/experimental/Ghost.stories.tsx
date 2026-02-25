//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { DXOS } from '@dxos/brand';
import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Ghost, type GhostController, type GhostProps } from './Ghost';

const DefaultStory = (props: Partial<GhostProps>) => {
  return (
    <>
      <Ghost {...props} />
      <div className='inset-0 absolute grid place-content-center'>
        <DXOS className='w-[40rem] h-[40rem] opacity-5' />
      </div>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Ghost',
  component: Ghost,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<GhostProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async () => {
    log.info('started');
  },
  args: {},
};

export const Variant: Story = {
  args: {
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 2,
    COLOR_UPDATE_SPEED: 0.3,
    COLOR_MASK: { r: 0.1, g: 0.1, b: 0.1 },
  },
};

export const Trace: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    SPLAT_RADIUS: 0.02,
    CURL: 3,
    COLOR_UPDATE_SPEED: 10,
  },
};

export const Fireball: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};

export const Atomic: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 15,
    SPLAT_RADIUS: 5,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};

export const Column: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  render: () => {
    return <Ghost classNames='border border-separator' />;
  },
};

export const Frame: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  render: (props) => (
    <>
      <Ghost {...props} classNames='border border-separator' />
      <div className='inset-0 absolute grid place-content-center'>
        <DXOS className='w-[40rem] h-[40rem] opacity-20' />
      </div>
    </>
  ),
  args: {
    frame: 48,
  },
};

// Lissajous path driven via GhostController.
const ControllerStory = (props: Partial<GhostProps>) => {
  const ref = useRef<GhostController>(null);

  useEffect(() => {
    let rafId: number;
    let t = 0;
    const tick = () => {
      t += 0.008;
      // Lissajous figure: x = sin(3t), y = sin(2t), mapped to [0.1, 0.9].
      const x = 0.5 + 0.4 * Math.sin(3 * t);
      const y = 0.5 + 0.4 * Math.sin(2 * t);
      ref.current?.move(x, y);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <Ghost ref={ref} {...props} />;
};

export const Controller: Story = {
  render: ControllerStory,
  args: {
    CURL: 10,
    COLOR_UPDATE_SPEED: 5,
  },
};

// Position on a path plus the inward-pointing unit normal, used to apply perpendicular wiggle.
type TrajectoryPoint = {
  x: number;
  y: number;
  nx: number; // inward unit normal x component (screen space)
  ny: number; // inward unit normal y component (screen space)
};

type Trajectory = {
  /** Total path length in CSS pixels for the given canvas dimensions. */
  length: (width: number, height: number) => number;
  /** Position and inward normal at distance dist (CSS pixels) along the path. */
  point: (dist: number, width: number, height: number) => TrajectoryPoint;
};

/** Rectangle orbit along the midline of a frame border. */
const rectangleTrajectory = (framePx: number): Trajectory => ({
  length: (width, height) => 2 * (width - framePx + height - framePx),
  point: (dist, width, height) => {
    const half = framePx / 2;
    const x0 = half / width,
      x1 = 1 - half / width;
    const y0 = half / height,
      y1 = 1 - half / height;
    const wPx = width - framePx,
      hPx = height - framePx;
    if (dist < wPx) {
      return { x: x0 + (dist / wPx) * (x1 - x0), y: y0, nx: 0, ny: 1 };
    } else if (dist < wPx + hPx) {
      return { x: x1, y: y0 + ((dist - wPx) / hPx) * (y1 - y0), nx: -1, ny: 0 };
    } else if (dist < 2 * wPx + hPx) {
      return { x: x1 - ((dist - wPx - hPx) / wPx) * (x1 - x0), y: y1, nx: 0, ny: -1 };
    } else {
      return { x: x0, y: y1 - ((dist - 2 * wPx - hPx) / hPx) * (y1 - y0), nx: 1, ny: 0 };
    }
  },
});

/** Circle orbit centered at canvas center, radius = min(width, height) * radiusFraction. */
const circleTrajectory = (radiusFraction = 0.4): Trajectory => ({
  length: (width, height) => 2 * Math.PI * Math.min(width, height) * radiusFraction,
  point: (dist, width, height) => {
    const r = Math.min(width, height) * radiusFraction;
    const theta = dist / r;
    const cosT = Math.cos(theta),
      sinT = Math.sin(theta);
    return {
      x: 0.5 + (r / width) * cosT,
      y: 0.5 + (r / height) * sinT,
      nx: -cosT, // inward = toward center
      ny: -sinT,
    };
  },
});

type TrailStoryProps = Partial<GhostProps> & {
  trajectory: Trajectory;
  speed?: number;
  wiggleAmplitude?: number;
};

// Generic trail story: drives the GhostController along any Trajectory with jitter and wiggle.
const TrailStory = ({ trajectory, speed = 10, wiggleAmplitude = 10, ...props }: TrailStoryProps) => {
  const ghostRef = useRef<GhostController>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Keep mutable state in a ref so the effect closure always sees the latest values.
  const stateRef = useRef({ dist: 0, wt: 0 });
  const trajectoryRef = useRef(trajectory);
  trajectoryRef.current = trajectory;

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const wrapper = wrapperRef.current;
      const ghost = ghostRef.current;
      if (wrapper && ghost) {
        const { width, height } = wrapper.getBoundingClientRect();
        const traj = trajectoryRef.current;
        const pathLength = traj.length(width, height);
        const jitter = 0; // (Math.random() - 0.5) * speed * 4;
        const state = stateRef.current;
        state.dist = (((state.dist + speed + jitter) % pathLength) + pathLength) % pathLength;
        state.wt += 0.08;
        const { x, y, nx, ny } = traj.point(state.dist, width, height);
        const wiggle = Math.sin(state.wt - state.dist * 0.012) * wiggleAmplitude;
        ghost.move(x + (nx * wiggle) / width, y + (ny * wiggle) / height);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [speed, wiggleAmplitude]);

  return (
    <div ref={wrapperRef} className='h-full w-full'>
      <Ghost ref={ghostRef} {...props} />
    </div>
  );
};

export const FrameTrail: Story = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: (props) => (
    <TrailStory {...props} trajectory={rectangleTrajectory(props.frame ?? 32)} speed={10} wiggleAmplitude={10} />
  ),
  args: {
    frame: 32,
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};

export const CircleTrail: Story = {
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  render: (props) => <TrailStory {...props} trajectory={circleTrajectory(0.2)} speed={20} wiggleAmplitude={15} />,
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};
