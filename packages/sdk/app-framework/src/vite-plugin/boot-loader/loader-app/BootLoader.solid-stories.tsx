//
// Copyright 2026 DXOS.org
//

import './boot-loader.css';

import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

import markSvg from '../../../../../../ui/brand/assets/icons/composer-icon.svg?raw';
import { Loader } from './Loader';
import { createLoaderStore } from './store';
import { SWARM_VARIANTS, type SwarmConfig, type SwarmVariant } from './swarm';

type StoryProps = Partial<SwarmConfig> & { variant: SwarmVariant | 'random' };

/** Ticks the "Loading plugins (k/12)" range status advances through. */
const PLUGIN_TICK_COUNT = 12;
/** Scripted timeline bounds (ms), matching the mockup's boot waterfall. */
const FRAMEWORK_START_MS = 0;
const PLUGIN_TICKS_START_MS = 2000;
const PLUGIN_TICKS_END_MS = 5500;
const CLIENT_START_MS = 5500;
const SPACE_OPEN_MS = 7000;
const READY_MS = 8000;
/** How long the outro plays before the story resets and loops. */
const OUTRO_RESET_MS = 1500;

/**
 * One boot cycle: schedules the scripted status/progress timeline against a
 * fresh {@link createLoaderStore}, plays the outro on `ready()`, then asks the
 * parent to remount so the story loops forever.
 */
const BootLoaderRun = (props: StoryProps & { onLoop: () => void }) => {
  const { variant, onLoop, ...overrides } = props;
  const store = createLoaderStore('Loading framework…');
  const timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = (delayMs: number, run: () => void): void => {
    timers.push(setTimeout(run, delayMs));
  };

  onMount(() => {
    store.setProgress(0.05);
    schedule(FRAMEWORK_START_MS + 700, () => store.setProgress(0.12));
    schedule(FRAMEWORK_START_MS + 1400, () => store.setProgress(0.19));
    schedule(PLUGIN_TICKS_START_MS, () => store.setProgress(0.25));

    const pluginWindowMs = PLUGIN_TICKS_END_MS - PLUGIN_TICKS_START_MS;
    for (let index = 1; index <= PLUGIN_TICK_COUNT; index++) {
      const atMs = PLUGIN_TICKS_START_MS + (index * pluginWindowMs) / PLUGIN_TICK_COUNT;
      schedule(atMs, () => {
        store.pushStatus({ humanized: 'Loading plugins', range: { index, total: PLUGIN_TICK_COUNT } });
        store.setProgress(0.25 + (index * 0.55) / PLUGIN_TICK_COUNT);
      });
    }

    schedule(CLIENT_START_MS, () => {
      store.pushStatus({ humanized: 'Starting client…' });
      store.setProgress(0.94);
    });

    schedule(SPACE_OPEN_MS, () => {
      store.pushStatus({ humanized: 'Opening space…' });
      store.setProgress(1);
    });

    schedule(READY_MS, () => {
      store.ready();
      schedule(OUTRO_RESET_MS, onLoop);
    });
  });

  onCleanup(() => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    store.dispose();
  });

  return (
    <div id='boot-loader' style={{ position: 'fixed', inset: 0 }} bool:data-dismissing={store.phase() === 'dismissing'}>
      <Loader store={store} markSvg={markSvg} swarm={{ ...(variant === 'random' ? {} : { variant }), ...overrides }} />
    </div>
  );
};

/**
 * Loops {@link BootLoaderRun} forever: each cycle plays the scripted boot →
 * outro, then this container remounts a fresh run via the `keyed` `<Show>` so
 * every field (dots, timers, store) starts clean rather than fighting leftover
 * animation state from the previous pass.
 */
const BootLoaderStory = (props: StoryProps) => {
  const [cycle, setCycle] = createSignal(1);
  return (
    <Show when={cycle()} keyed>
      {/* `keyed` only re-invokes this callback (forcing a remount) when it takes an argument. */}
      {(_cycle) => <BootLoaderRun {...props} onLoop={() => setCycle((value) => value + 1)} />}
    </Show>
  );
};

const meta = {
  title: 'sdk/app-framework/BootLoader',
  render: (args: StoryProps) => <BootLoaderStory {...args} />,
  argTypes: {
    variant: { control: 'select', options: ['random', ...SWARM_VARIANTS] },
    dotCount: { control: { type: 'range', min: 8, max: 96, step: 1 } },
    dotSize: { control: { type: 'range', min: 0.5, max: 6, step: 0.1 } },
    ringRotationSpeed: { control: { type: 'range', min: 0, max: 0.0006, step: 0.00005 } },
    ringRadius: { control: { type: 'range', min: 40, max: 140, step: 2 } },
    outerRadius: { control: { type: 'range', min: 80, max: 220, step: 2 } },
    nogoRadius: { control: { type: 'range', min: 20, max: 100, step: 2 } },
    settleMs: { control: { type: 'range', min: 100, max: 2000, step: 50 } },
    outroMs: { control: { type: 'range', min: 200, max: 2000, step: 50 } },
  },
} satisfies Meta<StoryProps>;

export default meta;

export const Default: StoryObj<StoryProps> = { args: { variant: 'random' } };

export const Wander: StoryObj<StoryProps> = { args: { variant: 'wander' } };

export const Orbit: StoryObj<StoryProps> = { args: { variant: 'orbit' } };

export const Trails: StoryObj<StoryProps> = { args: { variant: 'trails' } };

export const Linked: StoryObj<StoryProps> = { args: { variant: 'linked' } };
