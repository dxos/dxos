//
// Copyright 2025 DXOS.org
//

import { useKeyboard, useRenderer } from '@opentui/solid';
import { Match, Show, Switch, createSignal } from 'solid-js';

// https://github.com/sst/opentui/blob/main/packages/solid/examples/repro-onSubmit.tsx

export const InputTest = () => {
  const renderer = useRenderer();

  renderer.useConsole = true;
  renderer.console.show();

  const [sig, setS] = createSignal(0);

  useKeyboard((key) => {
    if (key.name === 'tab') {
      setS((s) => (s + 1) % 3);
    }
  });

  const onSubmit = () => {
    console.log('input');
  };

  return (
    <box border title='input'>
      <Switch>
        <Match when={sig() === 0}>
          <box border title='input 0' height={3}>
            <input
              focused
              placeholder='input0'
              // onSubmit={onSubmit}
              onSubmit={() => {
                console.log('input 0');
              }}
            />
          </box>
        </Match>
        <Match when={sig() === 1}>
          <Show when={sig() > 0}>
            <box border title='input 1' height={3}>
              <input
                focused
                placeholder='input1'
                // onSubmit={onSubmit}
                onSubmit={() => {
                  console.log('input 1');
                }}
              />
            </box>
          </Show>
        </Match>
        <Match when={sig() === 2}>
          <box border title='input 2' height={3}>
            <input
              focused
              placeholder='input2'
              // onSubmit={onSubmit}
              onSubmit={() => {
                console.log('input 2');
              }}
            />
          </box>
        </Match>
      </Switch>
    </box>
  );
};
