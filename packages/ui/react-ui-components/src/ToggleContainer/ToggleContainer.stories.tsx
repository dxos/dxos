//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type ReadonlySignal, computed, signal } from '@preact/signals-core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Icon, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownViewer } from '../MarkdownViewer';

import { ToggleContainer, type ToggleContainerProps } from './ToggleContainer';

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

const DefaultStory = ({ shrinkX, ...props }: ToggleContainerProps) => {
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
    <div className='flex flex-col w-[30rem]'>
      <Toolbar.Root classNames='p-4'>
        <Input.Root>
          <Input.Switch checked={running} onCheckedChange={(checked) => setRunning(checked)} />
        </Input.Root>
        <div className='grow' />
        <div>{generator.count.value}</div>
      </Toolbar.Root>
      <div className='flex p-4'>
        <div className={mx('border border-border rounded-md p-2', !shrinkX && 'w-full')}>
          <ToggleContainer
            {...props}
            shrinkX={shrinkX}
            icon={
              running ? (
                <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued ml-2 animate-spin' size={4} />
              ) : undefined
            }
          >
            <MarkdownViewer classNames='text-sm' content={generator.text.value.join('\n\n')} />
          </ToggleContainer>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof ToggleContainer> = {
  title: 'ui/react-ui-components/ToggleContainer',
  component: ToggleContainer,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center bg-baseSurface' })],
};

export default meta;

type Story = StoryObj<typeof ToggleContainer>;

export const Default: Story = {
  args: {
    title: 'Markdown',
  },
};

export const Shrink: Story = {
  args: {
    title: 'Markdown',
    shrinkX: true,
  },
};
