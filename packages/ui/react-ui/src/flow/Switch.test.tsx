//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { Switch } from './Switch';

describe('Switch', () => {
  afterEach(cleanup);

  test('renders the branch whose `when` strictly equals `on`', () => {
    render(
      <Switch.Root on='b'>
        <Switch.Match when='a'>
          <div data-testid='a' />
        </Switch.Match>
        <Switch.Match when='b'>
          <div data-testid='b' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(screen.queryByTestId('a')).toBeNull();
    expect(screen.queryByTestId('b')).not.toBeNull();
  });

  test('renders only the first of several matching branches', () => {
    render(
      <Switch.Root on='a'>
        <Switch.Match when='a'>
          <div data-testid='first' />
        </Switch.Match>
        <Switch.Match when='a'>
          <div data-testid='second' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(screen.queryByTestId('first')).not.toBeNull();
    expect(screen.queryByTestId('second')).toBeNull();
  });

  test('strict equality does not coerce', () => {
    render(
      <Switch.Root on={1} fallback={<div data-testid='fallback' />}>
        <Switch.Match when='1'>
          <div data-testid='coerced' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(screen.queryByTestId('coerced')).toBeNull();
    expect(screen.queryByTestId('fallback')).not.toBeNull();
  });

  test('predicate `when` matches on the discriminant', () => {
    render(
      <Switch.Root on={5}>
        <Switch.Match when={(value: number) => value < 3}>
          <div data-testid='low' />
        </Switch.Match>
        <Switch.Match when={(value: number) => value >= 3}>
          <div data-testid='high' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(screen.queryByTestId('low')).toBeNull();
    expect(screen.queryByTestId('high')).not.toBeNull();
  });

  test('no match and no fallback renders nothing', () => {
    const { container } = render(
      <Switch.Root on='c'>
        <Switch.Match when='a'>
          <div data-testid='a' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(container.innerHTML).toBe('');
  });

  test('non-Match children are ignored', () => {
    render(
      <Switch.Root on='a' fallback={<div data-testid='fallback' />}>
        <div data-testid='stray' />
      </Switch.Root>,
    );
    expect(screen.queryByTestId('stray')).toBeNull();
    expect(screen.queryByTestId('fallback')).not.toBeNull();
  });

  test('adds no wrapper element', () => {
    const { container } = render(
      <Switch.Root on='a'>
        <Switch.Match when='a'>
          <div data-testid='a' />
        </Switch.Match>
      </Switch.Root>,
    );
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('a');
  });
});
