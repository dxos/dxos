//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, computed, signal } from '@preact/signals-core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Icon, Input, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { MarkdownViewer } from '@dxos/react-ui-markdown';

import { ToggleContainer, type ToggleContainerRootProps } from './ToggleContainer';

class Generator {
  private readonly _current = signal<string>(faker.lorem.sentence(5));
  private readonly _lines = signal<string[]>([]);
  private _running: NodeJS.Timeout | undefined;

  readonly count = computed(() => this._lines.value.length);
  readonly text: ReadonlySignal<string[]> = computed(() => [...this._lines.value, this._current.value]);

  start(): void {
    this.stop();
    this._running = setInterval(() => {
      if (this._current.value.length > 0) {
        this._current.value += ' ';
      }
      this._current.value += faker.lorem.words(Math.ceil(Math.random() * 2));
      if (Math.random() > 0.95) {
        this._lines.value = [...this._lines.value, this._current.value + '.'];
        this._current.value = '';
      }
    }, 100);
  }

  stop(): void {
    if (this._running) {
      clearInterval(this._running);
      this._running = undefined;
    }
  }
}

const DefaultStory = (props: ToggleContainerRootProps) => {
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
    <div className='flex flex-col is-[30rem]'>
      <Toolbar.Root>
        <Input.Root>
          <Input.Switch checked={running} onCheckedChange={(checked) => setRunning(checked)} />
        </Input.Root>
        <div className='grow' />
        <div>{generator.count.value}</div>
      </Toolbar.Root>
      <div className='flex p-4'>
        <ToggleContainer.Root classNames='border border-separator rounded-md' {...props}>
          <ToggleContainer.Header
            icon={
              running ? (
                <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued animate-spin' size={4} />
              ) : undefined
            }
          >
            Test
          </ToggleContainer.Header>
          <ToggleContainer.Content classNames='bg-modalSurface'>
            <MarkdownViewer classNames='p-2 text-sm' content={generator.text.value.join('\n\n')} />
          </ToggleContainer.Content>
        </ToggleContainer.Root>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/ToggleContainer',
  component: ToggleContainer.Root,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ToggleContainer.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Shrink: Story = {
  args: {
    shrink: true,
  },
};
