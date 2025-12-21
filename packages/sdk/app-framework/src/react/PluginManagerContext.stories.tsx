//
// Copyright 2025 DXOS.org
//

import { effect, signal } from '@preact/signals-core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { useWebComponentContext } from '@dxos/web-context-react';

import { Capabilities } from '../common';
import { Events } from '../common';
import { PluginManagerContext } from '../context';
import { contributes, defineCapability, defineModule, definePlugin } from '../core';

import { useApp } from './useApp';

// Define the Counter capability
const Counter = defineCapability<{ count: number; increment: () => void }>('example/counter');

const CountStatus = () => {
  const manager = useWebComponentContext(PluginManagerContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!manager) {
      return;
    }

    return effect(() => {
      try {
        const counter = manager.context.getCapability(Counter);
        setCount(counter.count);
      } catch (_err) {}
    });
  }, [manager]);

  if (!manager) return null;

  const isEven = count % 2 === 0;

  return (
    <div
      className={`mt-4 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        isEven
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      }`}
    >
      Status: {isEven ? 'Even' : 'Odd'}
    </div>
  );
};

// A component that consumes the PluginManager via web context
const CounterComponent = () => {
  // Use the web-context hook to get the PluginManager
  const manager = useWebComponentContext(PluginManagerContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!manager) {
      return;
    }

    // Subscribe to the count signal
    // note: manager.context.getCapability might throw if not ready, but effect handles dependencies dynamicially
    const unsubscribe = effect(() => {
      try {
        const counter = manager.context.getCapability(Counter);
        setCount(counter.count);
      } catch (_err) {
        // Capability might not be available yet
      }
    });

    return unsubscribe;
  }, [manager]);

  if (!manager) {
    return <div className='p-4 text-red-500'>Error: Context not found</div>;
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white'>
      <div className='p-8 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 max-w-md w-full'>
        <h2 className='text-2xl font-bold mb-6 text-center text-primary-600 dark:text-primary-400'>
          Web Context Counter
        </h2>

        <div className='flex flex-col items-center gap-6'>
          <div className='text-6xl font-mono font-bold tabular-nums tracking-tighter'>{count}</div>

          <button
            className='px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full transition-colors shadow-md active:transform active:scale-95'
            onClick={() => {
              const counter = manager.context.getCapability(Counter);
              counter.increment();
            }}
          >
            Increment
          </button>

          <CountStatus />
        </div>

        <div className='mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-center'>
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            This component accesses the <code>PluginManager</code> via <code>useWebComponentContext</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

// Plugin that provides the Counter capability and renders the UI
const CounterPlugin = definePlugin(
  {
    id: 'dxos.org/plugin/counter',
    name: 'Counter Plugin',
  },
  () => [
    defineModule({
      id: 'dxos.org/plugin/counter/main',
      activatesOn: Events.Startup,
      activate: () => {
        const count = signal(0);

        return [
          // Contribute the state/logic
          contributes(Counter, {
            get count() {
              return count.value;
            },
            increment: () => {
              count.value++;
            },
          }),

          // Contribute the UI
          contributes(Capabilities.ReactRoot, {
            id: 'dxos.org/plugin/counter/root',
            root: CounterComponent,
          }),
        ];
      },
    }),
  ],
);

const plugins = [CounterPlugin()];
const core = ['dxos.org/plugin/counter'];
const placeholder = () => (
  <div className='flex h-screen items-center justify-center p-4 text-lg text-neutral-500'>
    Initializing Application...
  </div>
);

const DefaultStory = () => {
  const App = useApp({
    plugins,
    core,
    placeholder,
  });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/PluginManagerContext',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
