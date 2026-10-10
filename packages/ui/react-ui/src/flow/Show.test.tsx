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
    render(<Show.Show when='value'>{content}</Show.Show>);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
    expect(screen.queryByTestId(FALLBACK)).toBeNull();
  });

  // ui-template `present`: only undefined/null/false are absent — 0 and '' still render.
  test.each([0, ''])('falsy-but-present value %j renders children', (value) => {
    render(<Show.Show when={value}>{content}</Show.Show>);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
  });

  test.each([undefined, null, false])('absent value %j renders the fallback', (value) => {
    render(
      <Show.Show when={value} fallback={fallback}>
        {content}
      </Show.Show>,
    );
    expect(screen.queryByTestId(CONTENT)).toBeNull();
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  test('absent value with no fallback renders nothing', () => {
    const { container } = render(<Show.Show when={undefined}>{content}</Show.Show>);
    expect(container.innerHTML).toBe('');
  });

  test('render prop receives the narrowed value', () => {
    const task: { title: string } | undefined = { title: 'Task 1' };
    render(<Show.Show when={task}>{(value) => <div data-testid={CONTENT}>{value.title}</div>}</Show.Show>);
    expect(screen.getByTestId(CONTENT).textContent).toBe('Task 1');
  });

  test('render prop is not called while absent', () => {
    const spy = vi.fn(() => content);
    render(
      <Show.Show when={undefined} fallback={fallback}>
        {spy}
      </Show.Show>,
    );
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  test('adds no wrapper element', () => {
    const { container } = render(<Show.Show when='value'>{content}</Show.Show>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe(CONTENT);
  });
});

const CONTENT = 'content';
const FALLBACK = 'fallback';

const content = <div data-testid={CONTENT} />;
const fallback = <div data-testid={FALLBACK} />;
