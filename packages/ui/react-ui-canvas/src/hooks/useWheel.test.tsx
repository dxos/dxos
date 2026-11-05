//
// Copyright 2026 DXOS.org
//
// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React, { useRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type WheelHandler, useWheel } from './useWheel.ts';

describe('useWheel', () => {
  afterEach(cleanup);

  test('takes the wheel by default, focused or not', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<View handler={handler} />);
    const event = wheel(getByTestId('view'));
    expect(handler).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  test('leaves a scroll to the page until focus is inside', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<View handler={handler} focusRequired />);
    const view = getByTestId('view');

    const scroll = wheel(view);
    expect(handler).not.toHaveBeenCalled();
    expect(scroll.defaultPrevented).toBe(false);

    view.focus();
    const focused = wheel(view);
    expect(handler).toHaveBeenCalledOnce();
    expect(focused.defaultPrevented).toBe(true);

    view.blur();
    wheel(view);
    expect(handler).toHaveBeenCalledOnce();
  });

  test('an unfocused pinch moves nothing and does not zoom the page', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<View handler={handler} focusRequired />);
    const event = wheel(getByTestId('view'), { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});

const View = ({ handler, focusRequired }: { handler: WheelHandler; focusRequired?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useWheel(ref, handler, { focusRequired });
  return <div ref={ref} tabIndex={0} data-testid='view' />;
};

const wheel = (element: HTMLElement, init: WheelEventInit = {}) => {
  const event = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
};
