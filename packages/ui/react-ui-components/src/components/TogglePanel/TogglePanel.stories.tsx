//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { MarkdownView } from '@dxos/react-ui-markdown';
import * as Field from '@dxos/react-ui/Field';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { TogglePanel, type TogglePanelRootProps } from './TogglePanel.tsx';

class Generator {
  private readonly _current: Atom.Writable<string>;
  private readonly _lines: Atom.Writable<string[]>;
  private _running: NodeJS.Timeout | undefined;

  readonly count: Atom.Atom<number>;
  readonly text: Atom.Atom<string[]>;

  constructor(private readonly _registry: Registry.AtomRegistry) {
    this._current = Atom.make<string>(random.lorem.sentence(5));
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
      const newCurrent = this._registry.get(this._current) + random.lorem.words(Math.ceil(Math.random() * 2));
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

const DefaultStory = (props: TogglePanelRootProps) => {
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
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Field.Root>
            <Input.Switch checked={running} onCheckedChange={({ checked }) => setRunning(checked)} />
          </Field.Root>
          <div className='grow' />
          <div>{count}</div>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <TogglePanel.Root {...props}>
          <TogglePanel.Content>
            <TogglePanel.Header
              icon={running ? <Icon.Icon icon={'ph--circle-notch--regular'} size='md' tone='subtle' spin /> : undefined}
            >
              Test
            </TogglePanel.Header>
            <TogglePanel.Body>
              <TogglePanel.Viewport>
                <MarkdownView classNames='p-2 text-sm' content={text.join('\n\n')} />
              </TogglePanel.Viewport>
            </TogglePanel.Body>
          </TogglePanel.Content>
        </TogglePanel.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-components/TogglePanel',
  component: TogglePanel.Root,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TogglePanel.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
