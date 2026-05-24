// @vitest-environment jsdom
//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, test, vi } from 'vitest';

import { useDateTimePicker } from './useDateTimePicker';

describe('useDateTimePicker', () => {
  test('uncontrolled: commit updates committed and fires onValueChange', ({ expect }) => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
        onValueChange,
      }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setDraft(new Date(2026, 4, 25)));
    act(() => result.current.commit());
    expect((result.current.committed as Date).getDate()).toBe(25);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  test('cancelDraft resets draft to committed', ({ expect }) => {
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
      }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setDraft(new Date(2026, 4, 25)));
    act(() => result.current.cancelDraft());
    expect((result.current.draft as Date).getDate()).toBe(24);
  });

  test('controlled: setCommitted does not mutate internal state when value prop provided', ({ expect }) => {
    const onValueChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: Date }) =>
        useDateTimePicker({
          mode: 'date',
          value,
          onValueChange,
        }),
      { initialProps: { value: new Date(2026, 4, 24) } },
    );
    act(() => result.current.setCommitted(new Date(2026, 4, 26)));
    expect((result.current.committed as Date).getDate()).toBe(24);
    expect(onValueChange).toHaveBeenCalledTimes(1);

    rerender({ value: new Date(2026, 4, 26) });
    expect((result.current.committed as Date).getDate()).toBe(26);
  });

  test('opening seeds draft from committed', ({ expect }) => {
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
      }),
    );
    act(() => result.current.setDraft(new Date(2026, 4, 30)));
    expect((result.current.draft as Date).getDate()).toBe(30);
    act(() => result.current.setOpen(true));
    expect((result.current.draft as Date).getDate()).toBe(24);
  });
});
