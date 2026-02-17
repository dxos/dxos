//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Icon, Input, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { MarkdownViewer } from '@dxos/react-ui-markdown';
import { withRegistry } from '@dxos/storybook-utils';

import { ToggleContainer, type ToggleContainerRootProps } from './ToggleContainer';

class Generator {
  private readonly _current: Atom.Writable<string>;
  private readonly _lines: Atom.Writable<string[]>;
  private _running: NodeJS.Timeout | undefined;

  readonly count: Atom.Atom<number>;
  readonly text: Atom.Atom<string[]>;

  constructor(private readonly _registry: Registry.Registry) {
    this._current = Atom.make<string>(faker.lorem.sentence(5));
    this._lines = Atom.make<string[]>([]);
    this.count = Atom.make((get) => get(this._lines).length);
    this.text = Atom.make((get) => [...get(this._lines), get(this._current)]);
  }

  start(): void {
    this.stop();
    this._running = setInterval(() => {
      const current = this._registry.get(this._current);
      const lines = this._registry.get(this._lines);
      if (current.length > 0) {
        this._registry.set(this._current, current + ' ');
      }
      const newCurrent = this._registry.get(this._current) + faker.lorem.words(Math.ceil(Math.random() * 2));
      this._registry.set(this._current, newCurrent);
      if (Math.random() > 0.95) {
        this._registry.set(this._lines, [...lines, newCurrent + '.']);
        this._registry.set(this._current, '');
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
  const registry = useContext(RegistryContext);
  const generator = useMemo(() => new Generator(registry), [registry]);
  const [running, setRunning] = useState(false);
  const count = useAtomValue(generator.count);
  const text = useAtomValue(generator.text);

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
        <div>{count}</div>
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
            <MarkdownViewer classNames='p-2 text-sm' content={text.join('\n\n')} />
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
  decorators: [withRegistry, withTheme()],
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
