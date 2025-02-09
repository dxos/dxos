//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { computed, type ReadonlySignal, signal } from '@preact/signals-core';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Input, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme, withSignals } from '@dxos/storybook-utils';

import { MarkdownViewer } from './components';

class Generator {
  private _running: NodeJS.Timeout | undefined;

  private readonly _current = signal<string>('');
  private readonly _lines = signal<string[]>([]);

  readonly count = computed(() => this._lines.value.length);
  readonly text: ReadonlySignal<string[]> = computed(() => [...this._lines.value, this._current.value]);

  start() {
    this.stop();
    this._running = setInterval(() => {
      if (this._current.value.length > 0) {
        this._current.value += ' ';
      }
      this._current.value += faker.lorem.words(Math.ceil(Math.random() * 2));
      if (Math.random() > 0.8) {
        this._lines.value = [...this._lines.value, this._current.value + '.'];
        this._current.value = '';
      }
    }, 100);
  }

  stop() {
    if (this._running) {
      clearInterval(this._running);
      this._running = undefined;
    }
  }
}

const Render = () => {
  const generator = useMemo(() => new Generator(), []);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (running) {
      generator.start();
    } else {
      generator.stop();
    }
  }, [running]);

  return (
    <div className='flex flex-col w-full'>
      <Toolbar.Root classNames='p-4'>
        <Input.Root>
          <Input.Switch checked={running} onCheckedChange={(checked) => setRunning(checked)} />
        </Input.Root>
        <div className='grow' />
        <div>{generator.count.value}</div>
      </Toolbar.Root>
      <div className='flex p-4'>
        <div className='border border-border rounded-md p-2'>
          <MarkdownViewer content={generator.text.value.join('\n\n')} />
        </div>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-automation/components',
  render: Render,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
