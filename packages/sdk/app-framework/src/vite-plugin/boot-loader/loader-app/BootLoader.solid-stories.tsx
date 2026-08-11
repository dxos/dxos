//
// Copyright 2026 DXOS.org
//

import './boot-loader.css';

import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

import markSvg from './composer-icon.svg?raw';
import { Loader } from './Loader';
import { createLoaderStore } from './store';
import { SWARM_VARIANTS, type SwarmConfig, type SwarmVariant } from './swarm';

type StoryProps = Partial<SwarmConfig> & {
  variant: SwarmVariant | 'random';
  showLog?: boolean;
};

/** Ticks the "Loading plugins (k/12)" range status advances through. */
const PLUGIN_TICK_COUNT = 12;
/** Scripted timeline bounds (ms), matching the mockup's boot waterfall. */
const FRAMEWORK_START_MS = 0;
const PLUGIN_TICKS_START_MS = 2000;
const PLUGIN_TICKS_END_MS = 5500;
/** How long the outro plays before the story resets and loops. */
const OUTRO_RESET_MS = 1500;

/**
 * One boot cycle: scripts the timeline through the plugin phase, then holds
 * indefinitely (the store's creep keeps the swarm alive) until the Complete
 * button plays client → space → ready → outro and asks the parent to remount.
 */
const BootLoaderRun = (props: StoryProps & { onLoop: () => void; registerComplete: (run: () => void) => void }) => {
  const { variant, onLoop, showLog, registerComplete, ...overrides } = props;
  const store = createLoaderStore('Loading framework…');
  const timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = (delayMs: number, run: () => void): void => {
    timers.push(setTimeout(run, delayMs));
  };

  let completing = false;
  const complete = (): void => {
    if (completing) {
      return;
    }
    completing = true;
    store.pushStatus({ humanized: 'Starting client…' });
    store.setProgress(0.94);
    schedule(1000, () => {
      store.pushStatus({ humanized: 'Opening space…' });
      store.setProgress(1);
    });
    schedule(1800, () => {
      store.ready();
      schedule(OUTRO_RESET_MS, onLoop);
    });
  };

  onMount(() => {
    registerComplete(complete);
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
  });

  onCleanup(() => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    store.dispose();
  });

  return (
    <div
      id='boot-loader'
      style={{ position: 'fixed', inset: 0 }}
      bool:data-dismissing={store.phase() === 'dismissing'}
      bool:data-hide-log={showLog === false}
    >
      {/* Storybook-only: the show/hide-log control drives the data attribute above. */}
      <style>{'#boot-loader[data-hide-log] #boot-loader-status { display: none; }'}</style>
      <Loader store={store} markSvg={markSvg} swarm={{ ...(variant === 'random' ? {} : { variant }), ...overrides }} />
    </div>
  );
};

const buttonStyle = {
  'padding': '4px 10px',
  'font': 'inherit',
  'cursor': 'pointer',
  'background': 'transparent',
  'color': 'inherit',
  'border': '1px solid currentColor',
  'border-radius': '4px',
  'opacity': 0.2,
} as const;

/**
 * Hosts the run and the control buttons: Complete plays the finish sequence of
 * the current run; Restart (and each completed outro) remounts a fresh run via
 * the `keyed` `<Show>` so every field starts clean.
 */
const BootLoaderStory = (props: StoryProps) => {
  const [cycle, setCycle] = createSignal(1);
  const restart = () => setCycle((value) => value + 1);
  let completeCurrentRun: (() => void) | undefined;
  return (
    <>
      <Show when={cycle()} keyed>
        {/* `keyed` only re-invokes this callback (forcing a remount) when it takes an argument. */}
        {(_cycle) => (
          <BootLoaderRun
            {...props}
            onLoop={restart}
            registerComplete={(run) => {
              completeCurrentRun = run;
            }}
          />
        )}
      </Show>
      {/* Above the fixed #boot-loader backdrop (z-index 10) so they stay clickable mid-boot. */}
      <div
        style={{ 'position': 'fixed', 'top': '8px', 'right': '8px', 'z-index': 20, 'display': 'flex', 'gap': '8px' }}
      >
        <button type='button' onClick={() => completeCurrentRun?.()} style={buttonStyle}>
          Complete
        </button>
        <button type='button' onClick={restart} style={buttonStyle}>
          Restart
        </button>
      </div>
    </>
  );
};

const meta = {
  title: 'sdk/app-framework/BootLoader',
  render: (args: StoryProps) => <BootLoaderStory {...args} />,
  argTypes: {
    variant: { control: 'select', options: ['random', ...SWARM_VARIANTS] },

    showLog: { control: 'boolean' },
    dotCount: { control: { type: 'range', min: 1, max: 200, step: 1 } },
    dotSize: { control: { type: 'range', min: 0.5, max: 6, step: 0.1 } },
    ringRotationSpeed: { control: { type: 'range', min: -10, max: 10, step: 0.5 } },
    ringRadius: { control: { type: 'range', min: 40, max: 140, step: 2 } },
    outerRadius: { control: { type: 'range', min: 80, max: 220, step: 2 } },
    nogoRadius: { control: { type: 'range', min: 20, max: 100, step: 2 } },
    settleMs: { control: { type: 'range', min: 100, max: 2000, step: 50 } },
    outroMs: { control: { type: 'range', min: 200, max: 2000, step: 50 } },
  },
} satisfies Meta<StoryProps>;

export default meta;

const defaults: Partial<StoryProps> = {
  showLog: true,
  dotSize: 1,
  dotCount: 50,
  ringRadius: 40,
  ringRotationSpeed: 2,
};

export const Default: StoryObj<StoryProps> = {
  args: {
    variant: 'random',
    ...defaults,
  },
};

export const Wander: StoryObj<StoryProps> = {
  args: {
    variant: 'wander',
    ...defaults,
  },
};

export const Orbit: StoryObj<StoryProps> = {
  args: {
    variant: 'orbit',
    ...defaults,
  },
};

export const Trails: StoryObj<StoryProps> = {
  args: {
    variant: 'trails',
    ...defaults,
  },
};

export const Halo: StoryObj<StoryProps> = { args: { variant: 'halo', showLog: true } };

export const Arc: StoryObj<StoryProps> = { args: { variant: 'arc', showLog: true } };

export const Linked: StoryObj<StoryProps> = {
  args: {
    variant: 'linked',
    ...defaults,
  },
};
