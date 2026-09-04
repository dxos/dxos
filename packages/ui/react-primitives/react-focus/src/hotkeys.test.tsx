//
// Copyright 2026 DXOS.org
//

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  GRAPH_ROOT_ID,
  type HotkeyStore,
  createHotkeyStore,
  hotkeyStore,
  nestHotkeyScope,
  registerHotkey,
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

  test('a scope change re-renders the active list, not just a registration change', async () => {
    const store = hotkeyStore;
    let seen: string[] = [];
    const Probe = () => {
      seen = useActiveHotkeys(store).map((command) => command.label ?? '');
      return null;
    };
    render(
      <>
        <Bindings
          store={store}
          commands={[{ hotkey: 'q', scopes: ['root/elsewhere'], label: 'Elsewhere', action: () => {} }]}
        />
        <Probe />
      </>,
    );

    expect(seen).not.toContain('Elsewhere');

    // Only the active scopes change here — the command map keeps its identity, which is exactly the
    // case a commands-only snapshot would miss.
    await act(async () => {
      setHotkeyScope('root/elsewhere', store);
    });
    expect(seen).toContain('Elsewhere');
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
    // Both, not one: the path-scan this replaced fired only the most specific match, so asserting
    // the pair is what catches a regression back to it.
    expect(fired).toEqual(['root', 'plank']);
  });
});

describe('hotkey conflicts', () => {
  const withWarnings = (register: (store: HotkeyStore) => void): string[] => {
    const warnings: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((message) => void warnings.push(String(message)));
    try {
      register(createHotkeyStore());
    } finally {
      spy.mockRestore();
    }
    return warnings;
  };

  test('sibling scopes binding the same hotkey are not a conflict', () => {
    // One `space.rename` per space is the case that flooded the console: Ark compares the hotkey
    // and the DOM target only, so every pair of spaces warned, on every graph sync.
    const warnings = withWarnings((store) => {
      for (const space of ['space-1', 'space-2', 'space-3']) {
        registerHotkey(
          { id: `${space}:rename`, hotkey: 'shift+F6', scopes: [`root/${space}`], action: () => {} },
          store,
        );
      }
    });

    expect(warnings).toEqual([]);
  });

  test('an ancestor scope binding the same hotkey is a conflict', () => {
    const warnings = withWarnings((store) => {
      registerHotkey({ id: 'root:rename', hotkey: 'shift+F6', scopes: [GRAPH_ROOT_ID], action: () => {} }, store);
      registerHotkey({ id: 'space:rename', hotkey: 'shift+F6', scopes: ['root/space-1'], action: () => {} }, store);
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('root:rename');
    expect(warnings[0]).toContain('space:rename');
  });

  test('an unscoped binding conflicts with every scope', () => {
    const warnings = withWarnings((store) => {
      registerHotkey({ id: 'global', hotkey: 'shift+F6', action: () => {} }, store);
      registerHotkey({ id: 'scoped', hotkey: 'shift+F6', scopes: ['root/space-1'], action: () => {} }, store);
    });

    expect(warnings).toHaveLength(1);
  });

  test('re-registering the same id is not a conflict with itself', () => {
    const warnings = withWarnings((store) => {
      for (let index = 0; index < 3; index++) {
        registerHotkey({ id: 'rename', hotkey: 'shift+F6', scopes: ['root/space-1'], action: () => {} }, store);
      }
    });

    expect(warnings).toEqual([]);
  });

  test('different hotkeys in the same scope are not a conflict', () => {
    const warnings = withWarnings((store) => {
      registerHotkey({ id: 'one', hotkey: 'shift+F6', scopes: ['root/space-1'], action: () => {} }, store);
      registerHotkey({ id: 'two', hotkey: 'shift+F7', scopes: ['root/space-1'], action: () => {} }, store);
    });

    expect(warnings).toEqual([]);
  });
});
