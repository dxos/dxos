//
// Copyright 2026 DXOS.org
//

import { render, screen } from '@testing-library/react';
import React, { Suspense } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { lazyWithPreload } from './lazyWithPreload.ts';

const Label = ({ text }: { text: string }) => <span>{text}</span>;

describe('lazyWithPreload', () => {
  test('renders synchronously once preloaded', async () => {
    const Component = lazyWithPreload(async () => ({ default: Label }));
    await Component.preload();
    render(
      <Suspense fallback={<span>loading</span>}>
        <Component text='ready' />
      </Suspense>,
    );
    expect(screen.queryByText('loading')).toBeNull();
    expect(screen.getByText('ready')).toBeDefined();
  });

  test('suspends when rendered before the module arrives', async () => {
    const Component = lazyWithPreload(async () => ({ default: Label }));
    render(
      <Suspense fallback={<span>loading</span>}>
        <Component text='ready' />
      </Suspense>,
    );
    expect(screen.getByText('loading')).toBeDefined();
    expect(await screen.findByText('ready')).toBeDefined();
  });

  test('fetches the module once', async () => {
    const factory = vi.fn(async () => ({ default: Label }));
    const Component = lazyWithPreload(factory);
    await Promise.all([Component.preload(), Component.preload()]);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test('retries after a failed fetch', async () => {
    const factory = vi
      .fn<() => Promise<{ default: typeof Label }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ default: Label });
    const Component = lazyWithPreload(factory);
    await expect(Component.preload()).rejects.toThrow('offline');
    await expect(Component.preload()).resolves.toBe(Label);
  });
});
