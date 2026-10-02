//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import * as Show from './Show.tsx';

describe('Show', () => {
  afterEach(cleanup);

  test('renders children when `when` is present', () => {
    render(<Show.Root when='value'>{content}</Show.Root>);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
    expect(screen.queryByTestId(FALLBACK)).toBeNull();
  });

  // ui-template `present`: only undefined/null/false are absent — 0 and '' still render.
  test.each([0, ''])('falsy-but-present value %j renders children', (value) => {
    render(<Show.Root when={value}>{content}</Show.Root>);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
  });

  test.each([undefined, null, false])('absent value %j renders the fallback', (value) => {
    render(
      <Show.Root when={value} fallback={fallback}>
        {content}
      </Show.Root>,
    );
    expect(screen.queryByTestId(CONTENT)).toBeNull();
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  test('absent value with no fallback renders nothing', () => {
    const { container } = render(<Show.Root when={undefined}>{content}</Show.Root>);
    expect(container.innerHTML).toBe('');
  });

  test('render prop receives the narrowed value', () => {
    const task: { title: string } | undefined = { title: 'Task 1' };
    render(<Show.Root when={task}>{(value) => <div data-testid={CONTENT}>{value.title}</div>}</Show.Root>);
    expect(screen.getByTestId(CONTENT).textContent).toBe('Task 1');
  });

  test('render prop is not called while absent', () => {
    const spy = vi.fn(() => content);
    render(
      <Show.Root when={undefined} fallback={fallback}>
        {spy}
      </Show.Root>,
    );
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  test('adds no wrapper element', () => {
    const { container } = render(<Show.Root when='value'>{content}</Show.Root>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe(CONTENT);
  });
});

const CONTENT = 'content';
const FALLBACK = 'fallback';

const content = <div data-testid={CONTENT} />;
const fallback = <div data-testid={FALLBACK} />;
