//
// Copyright 2026 DXOS.org
//

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Menu } from './Menu.tsx';

describe('Menu', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Callers build `item` at runtime (graph actions, mapped options), so a missing one must name the part.
  test('item parts without an `item` fail naming the part', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error The missing `item` is the case under test.
    expect(() => render(<Menu.Item />)).toThrow('Menu.Item requires an `item`');
    // @ts-expect-error The missing `item` is the case under test.
    expect(() => render(<Menu.CheckboxItem />)).toThrow('Menu.CheckboxItem requires an `item`');
    // @ts-expect-error The missing `item` is the case under test.
    expect(() => render(<Menu.RadioItem />)).toThrow('Menu.RadioItem requires an `item`');
    // @ts-expect-error The missing `item` is the case under test.
    expect(() => render(<Menu.TriggerItem />)).toThrow('Menu.TriggerItem requires an `item`');
  });
});
