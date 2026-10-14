//
// Copyright 2026 DXOS.org
//

import { type Mock, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DX_POPOVER_CONTENT_ATTR } from '@dxos/ui-types';

import { AnchorHover } from './anchor-hover.ts';

describe('AnchorHover', () => {
  let anchor: HTMLElement;
  let card: HTMLElement;
  let outside: HTMLElement;
  let open: Mock<() => void>;
  let close: Mock<() => void>;
  let hover: AnchorHover;

  const pointerOver = (target: Element) => target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));

  beforeEach(() => {
    vi.useFakeTimers();
    anchor = document.createElement('span');
    card = document.createElement('div');
    card.setAttribute(DX_POPOVER_CONTENT_ATTR, '');
    outside = document.createElement('div');
    document.body.append(anchor, card, outside);
    open = vi.fn<() => void>();
    close = vi.fn<() => void>();
    hover = new AnchorHover({ anchor, open, close });
  });

  afterEach(() => {
    hover.reset();
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  test('opens after hover intent, not on a pass-through', () => {
    hover.enter('mouse');
    hover.leave();
    vi.runAllTimers();
    expect(open).not.toHaveBeenCalled();

    hover.enter('mouse');
    vi.runAllTimers();
    expect(open).toHaveBeenCalledOnce();
  });

  test('touch never opens', () => {
    hover.enter('touch');
    vi.runAllTimers();
    expect(open).not.toHaveBeenCalled();
  });

  test('stays open while the pointer travels onto the card, closes once it leaves both', () => {
    hover.enter('mouse');
    vi.runAllTimers();
    hover.leave();
    pointerOver(card);
    vi.runAllTimers();
    expect(close).not.toHaveBeenCalled();

    pointerOver(outside);
    vi.runAllTimers();
    expect(close).toHaveBeenCalledOnce();
  });

  test('interacting with the card pins it', () => {
    hover.enter('mouse');
    vi.runAllTimers();
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    pointerOver(outside);
    vi.runAllTimers();
    expect(close).not.toHaveBeenCalled();
  });

  test('reset cancels a pending open', () => {
    hover.enter('mouse');
    hover.reset();
    vi.runAllTimers();
    expect(open).not.toHaveBeenCalled();
  });
});
