//
// Copyright 2023 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { Keyboard, nestKeyboardContext } from './keyboard';

describe('keyboard', () => {
  test('binds shortcuts on the active context', () => {
    const keyboard = new Keyboard();
    keyboard.bind({ shortcut: 'meta+k', handler: () => true });
    expect(keyboard.getBindings()).to.have.length(1);
  });

  test('child context inherits root bindings', async () => {
    const keyboard = new Keyboard();
    const handler = vi.fn();
    keyboard.getContext('root').bind({ shortcut: 'shift+meta+f', handler });
    keyboard.setCurrentContext('root/plank-1');

    await keyboard.handleKeyDown({
      altKey: false,
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
      key: 'F',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent);

    expect(handler).toHaveBeenCalledOnce();
  });

  test('nestKeyboardContext nests attendable ids under graph root', ({ expect }) => {
    expect(nestKeyboardContext('')).to.equal('root');
    expect(nestKeyboardContext('plank-1')).to.equal('root/plank-1');
    expect(nestKeyboardContext('root/plank-1')).to.equal('root/plank-1');
  });
});
