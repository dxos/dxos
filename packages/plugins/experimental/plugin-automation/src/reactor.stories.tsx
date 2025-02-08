//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { computed, signal, type ReadonlySignal } from '@preact/signals-core';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useMemo } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme, withSignals } from '@dxos/storybook-utils';

class Generator {
  private _running: NodeJS.Timeout | undefined;

  private readonly _text = signal<string[]>([]);

  private readonly _effect = computed(() => {
    return `${String(this._text.value.length).padStart(3, '0')} ${this._text.value.join(' ')}`;
  });

  get text(): ReadonlySignal<string> {
    return this._effect;
  }

  start() {
    this.stop();
    this._running = setInterval(() => {
      this._text.value = [...this._text.value, faker.lorem.word()];
    }, 2_000);
  }

  stop() {
    if (this._running) {
      clearInterval(this._running);
      this._running = undefined;
    }
  }
}

const meta: Meta = {
  title: 'plugins/plugin-automation/reactor',
  render: () => {
    const generator = useMemo(() => new Generator(), []);
    useEffect(() => {
      generator.start();
      return () => generator.stop();
    }, []);

    const text = generator.text.value;
    return (
      <div className='font-mono text-xl p-4'>
        {text}
        <span className='animate-[pulse_1s_steps(1)_infinite] text-primary-500'>|</span>
      </div>
    );
  },
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
