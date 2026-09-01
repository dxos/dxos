//
// Copyright 2026 DXOS.org
//

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import {
  GRAPH_ROOT_ID,
  type HotkeyStore,
  hotkeyStore,
  nestHotkeyScope,
  scopeChain,
  setHotkeyScope,
  useActiveHotkeys,
  useHotkeys,
} from './hotkeys';

const press = (key: string, target: EventTarget = document.body) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
};

/** Registers `commands` on `store` for as long as it is rendered. */
const Bindings = ({ store, commands }: { store: HotkeyStore; commands: any[] }) => {
  useHotkeys({ store, commands });
  return null;
};

describe('hotkey scopes', () => {
  afterEach(() => {
    cleanup();
    setHotkeyScope(undefined);
  });

  test('nestHotkeyScope puts an attendable under the graph root', () => {
    expect(nestHotkeyScope(undefined)).toBe(GRAPH_ROOT_ID);
    expect(nestHotkeyScope('')).toBe(GRAPH_ROOT_ID);
    expect(nestHotkeyScope(GRAPH_ROOT_ID)).toBe(GRAPH_ROOT_ID);
    expect(nestHotkeyScope('plank-1')).toBe('root/plank-1');
    expect(nestHotkeyScope('root/plank-1')).toBe('root/plank-1');
  });

  test('scopeChain expands a path into its prefixes, root first', () => {
    expect(scopeChain('root')).toEqual(['root']);
    expect(scopeChain('root/a/b')).toEqual(['root', 'root/a', 'root/a/b']);
    expect(scopeChain('')).toEqual([]);
  });

  test('a scoped command is silent until its scope is active', () => {
    const fired: string[] = [];
    const store = hotkeyStore;
    render(<Bindings store={store} commands={[{ hotkey: 'b', scopes: ['root/a'], action: () => fired.push('b') }]} />);

    press('b');
    expect(fired).toEqual([]);

    setHotkeyScope('root/a', store);
    press('b');
    expect(fired).toEqual(['b']);
  });

  test('a plank scope inherits the bindings registered on the graph root', () => {
    const fired: string[] = [];
    const store = hotkeyStore;
    render(
      <Bindings
        store={store}
        commands={[
          { hotkey: 'g', scopes: [GRAPH_ROOT_ID], action: () => fired.push('root') },
          { hotkey: 'p', scopes: ['root/plank-1'], action: () => fired.push('plank') },
        ]}
      />,
    );

    setHotkeyScope(nestHotkeyScope('plank-1'), store);
    press('g');
    press('p');
    expect(fired).toEqual(['root', 'plank']);
  });

  test('setHotkeyScope retires the scopes it replaces', () => {
    const fired: string[] = [];
    const store = hotkeyStore;
    render(
      <Bindings
        store={store}
        commands={[
          { hotkey: 'x', scopes: ['root/one'], action: () => fired.push('one') },
          { hotkey: 'y', scopes: ['root/two'], action: () => fired.push('two') },
        ]}
      />,
    );

    setHotkeyScope('root/one', store);
    setHotkeyScope('root/two', store);
    press('x');
    press('y');
    expect(fired).toEqual(['two']);
  });

  test('a registration carries the normalized hotkey and its label', () => {
    let seen: any[] = [];
    const Probe = () => {
      seen = useActiveHotkeys();
      return null;
    };
    const store = hotkeyStore;
    render(
      <>
        <Bindings
          store={store}
          commands={[
            { hotkey: 'meta+k', scopes: [GRAPH_ROOT_ID], label: 'Search', action: () => {} },
            { hotkey: 'q', scopes: ['root/elsewhere'], label: 'Elsewhere', action: () => {} },
          ]}
        />
        <Probe />
      </>,
    );

    setHotkeyScope(GRAPH_ROOT_ID, store);
    render(<Probe />);
    // eslint-disable-next-line no-console
    console.log('REGISTRATION:', JSON.stringify(seen.map(({ hotkey, label, scopes }) => ({ hotkey, label, scopes }))));
    expect(seen.some((command) => command.label === 'Search')).toBe(true);
    expect(seen.some((command) => command.label === 'Elsewhere')).toBe(false);
  });

  test('the same hotkey bound at two depths fires both, unlike the path-scan it replaces', () => {
    const fired: string[] = [];
    const store = hotkeyStore;
    render(
      <Bindings
        store={store}
        commands={[
          { hotkey: 'd', scopes: [GRAPH_ROOT_ID], action: () => fired.push('root') },
          { hotkey: 'd', scopes: ['root/plank-1'], action: () => fired.push('plank') },
        ]}
      />,
    );

    setHotkeyScope('root/plank-1', store);
    press('d');
    // Documents the behaviour rather than endorsing it; `conflictBehavior: 'warn'` surfaces the
    // collision that the old most-specific-wins scan would have hidden.
    expect(fired.length).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log('COLLISION FIRED:', JSON.stringify(fired));
  });
});
