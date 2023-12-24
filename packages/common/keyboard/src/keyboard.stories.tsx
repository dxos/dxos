//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Select, Input } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { type KeyHandler, Keyboard } from './keyboard';

const contexts = ['/', '/space/1', '/space/2', '/space/2/a', '/space/2/b'];

const Story = () => {
  const [context, setContext] = useState<string | undefined>(undefined);
  const [bindings, setBindings] = useState({});

  useEffect(() => {
    const handler: KeyHandler = ({ context, binding, data }) => console.log({ context, binding, data });

    Keyboard.singleton.initialize();
    Keyboard.singleton.bind({ binding: 'meta+k', handler, data: 'commands' });
    Keyboard.singleton.getContext('/space/2').bind({ binding: 'meta+/', handler, data: 'space 2' });
    Keyboard.singleton.getContext('/space/2/b').bind({ binding: 'shift+meta+.', handler });
    Keyboard.singleton.getContext('/space/1').bind({ binding: 'meta+/', handler, data: 'space 1' });

    setBindings(Keyboard.singleton.getBindings());

    return () => Keyboard.singleton.destroy();
  }, []);

  const handleChange = (path: string) => {
    Keyboard.singleton.setContext(path);
    setContext(path);
    setBindings(Keyboard.singleton.getBindings());
  };

  // TODO(burdon): BUG: Error in order of hooks.
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2'>
        <Select.Root value={context} onValueChange={handleChange}>
          <Select.TriggerButton placeholder='Select context' />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                {contexts.map((context, i) => (
                  <Select.Option key={i} value={context}>
                    {context}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Input.Root>
          <Input.TextInput placeholder='Test input' />
        </Input.Root>
      </div>
      <pre>{JSON.stringify(bindings, undefined, 2)}</pre>
    </div>
  );
};

export default {
  title: 'keyboard/Keyboard',
  decorators: [withTheme],
  render: Story,
};

export const Default = {};
