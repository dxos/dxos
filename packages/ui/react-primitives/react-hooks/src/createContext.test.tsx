//
// Copyright 2026 DXOS.org
//

import { render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';

import { createContext } from './createContext';

describe('createContext', () => {
  test('provider takes the fields as props and the hook returns them', () => {
    const [Provider, useValue] = createContext<{ label: string }>('Thing');
    const Consumer = () => <span>{useValue('Consumer').label}</span>;
    render(
      <Provider label='hello'>
        <Consumer />
      </Provider>,
    );
    expect(screen.getByText('hello')).toBeDefined();
  });

  test('throws naming consumer and root when unprovided', () => {
    const [, useValue] = createContext<{ label: string }>('Thing');
    expect(() => renderHook(() => useValue('Orphan'))).toThrow('`Orphan` must be used within `Thing`');
  });

  test('falls back to the default context', () => {
    const [, useValue] = createContext<{ label: string }>('Thing', { label: 'default' });
    const { result } = renderHook(() => useValue('Orphan'));
    expect(result.current.label).toBe('default');
  });
});
