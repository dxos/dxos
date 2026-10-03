//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { Match } from './Match.tsx';

describe('Match', () => {
  afterEach(cleanup);

  test('renders the branch whose `when` strictly equals `on`', () => {
    render(
      <Match.Root on='b'>
        <Match.Case when='a'>
          <div data-testid='a' />
        </Match.Case>
        <Match.Case when='b'>
          <div data-testid='b' />
        </Match.Case>
      </Match.Root>,
    );
    expect(screen.queryByTestId('a')).toBeNull();
    expect(screen.queryByTestId('b')).not.toBeNull();
  });

  test('renders only the first of several matching branches', () => {
    render(
      <Match.Root on='a'>
        <Match.Case when='a'>
          <div data-testid='first' />
        </Match.Case>
        <Match.Case when='a'>
          <div data-testid='second' />
        </Match.Case>
      </Match.Root>,
    );
    expect(screen.queryByTestId('first')).not.toBeNull();
    expect(screen.queryByTestId('second')).toBeNull();
  });

  test('strict equality does not coerce', () => {
    render(
      <Match.Root on={1} fallback={<div data-testid='fallback' />}>
        <Match.Case when='1'>
          <div data-testid='coerced' />
        </Match.Case>
      </Match.Root>,
    );
    expect(screen.queryByTestId('coerced')).toBeNull();
    expect(screen.queryByTestId('fallback')).not.toBeNull();
  });

  test('predicate `when` matches on the discriminant', () => {
    render(
      <Match.Root on={5}>
        <Match.Case when={(value: number) => value < 3}>
          <div data-testid='low' />
        </Match.Case>
        <Match.Case when={(value: number) => value >= 3}>
          <div data-testid='high' />
        </Match.Case>
      </Match.Root>,
    );
    expect(screen.queryByTestId('low')).toBeNull();
    expect(screen.queryByTestId('high')).not.toBeNull();
  });

  test('no match and no fallback renders nothing', () => {
    const { container } = render(
      <Match.Root on='c'>
        <Match.Case when='a'>
          <div data-testid='a' />
        </Match.Case>
      </Match.Root>,
    );
    expect(container.innerHTML).toBe('');
  });

  test('non-Match children are ignored', () => {
    render(
      <Match.Root on='a' fallback={<div data-testid='fallback' />}>
        <div data-testid='stray' />
      </Match.Root>,
    );
    expect(screen.queryByTestId('stray')).toBeNull();
    expect(screen.queryByTestId('fallback')).not.toBeNull();
  });

  test('adds no wrapper element', () => {
    const { container } = render(
      <Match.Root on='a'>
        <Match.Case when='a'>
          <div data-testid='a' />
        </Match.Case>
      </Match.Root>,
    );
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('a');
  });
});
