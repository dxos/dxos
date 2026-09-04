//
// Copyright 2026 DXOS.org
//

import './boot-loader.css';

import { onCleanup, onMount } from 'solid-js';
import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

import { Loader } from './Loader';
import { createLoaderStore } from './store';

/**
 * The boot loader, mounted from the same component the inlined bundle uses, so the two cannot drift.
 *
 * The backdrop `#boot-loader` is static markup injected into `index.html` by `bootLoaderPlugin`, not
 * rendered by this component — the decorator below stands in for it.
 */
const meta: Meta = {
  title: 'sdk/app-framework/BootLoader',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story: any) => (
      <div id='boot-loader' style={{ position: 'fixed', inset: '0' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj;

/** Normal startup: the ring creeps, statuses append, then the host reports ready. */
export const Default: Story = {
  render: () => {
    const store = createLoaderStore('Starting…');
    onMount(() => {
      const timers = [
        setTimeout(() => store.pushStatus({ humanized: 'Loading plugins', range: { index: 12, total: 80 } }), 400),
        setTimeout(() => store.setProgress(0.4), 900),
        setTimeout(() => store.pushStatus({ humanized: 'Activating Observability: react-surface' }), 1_400),
        setTimeout(() => store.setProgress(0.8), 1_900),
        setTimeout(() => store.ready(), 2_400),
      ];
      onCleanup(() => timers.forEach(clearTimeout));
    });
    onCleanup(() => store.dispose());
    return <Loader store={store} />;
  },
};

/**
 * Startup outran its budget in dev.
 *
 * The point of the story: the ring keeps creeping and statuses keep arriving BEHIND the offer —
 * startup has not been cancelled, and the user chooses whether to end it. Clicking logs the abort so
 * the wiring is visible without a host attached.
 */
export const Stalled: Story = {
  render: () => {
    const store = createLoaderStore('Starting…');
    onMount(() => {
      const timers = [
        setTimeout(() => store.setProgress(0.35), 500),
        // The host's deadline firing. Short here; 30s in the app.
        setTimeout(() => store.stalled(() => console.log('abort pressed — host would fail startup here')), 1_500),
        // Startup carrying on regardless, which is the behaviour being demonstrated.
        setTimeout(() => store.pushStatus({ humanized: 'Opening storage (still working)' }), 2_500),
        setTimeout(() => store.pushStatus({ humanized: 'Activating Client: echo' }), 3_500),
        setTimeout(() => store.setProgress(0.6), 4_000),
      ];
      onCleanup(() => timers.forEach(clearTimeout));
    });
    onCleanup(() => store.dispose());
    return <Loader store={store} />;
  },
};

/** The offer is withdrawn if startup completes after all — `ready()` clears it. */
export const StalledThenReady: Story = {
  render: () => {
    const store = createLoaderStore('Starting…');
    onMount(() => {
      const timers = [
        setTimeout(() => store.stalled(() => console.log('abort pressed')), 1_000),
        setTimeout(() => store.pushStatus({ humanized: 'Recovered — finishing startup' }), 2_500),
        setTimeout(() => store.ready(), 3_500),
      ];
      onCleanup(() => timers.forEach(clearTimeout));
    });
    onCleanup(() => store.dispose());
    return <Loader store={store} />;
  },
};
