//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { useFormHandler } from './useFormHandler';

const schema = Schema.mutable(
  Schema.Struct({
    name: Schema.NonEmptyString,
    city: Schema.String,
  }),
);
type Values = Schema.Schema.Type<typeof schema>;

// Only the AST `_tag` matters to `onValueChange` (it special-cases numbers), so a plain string AST is enough here.
const stringAst = Schema.String.ast;

describe('useFormHandler reactive buffering', () => {
  test('adopts external changes to fields the user is not editing', ({ expect }) => {
    const { result, rerender } = renderHook(({ values }) => useFormHandler<Values>({ schema, values }), {
      initialProps: { values: { name: 'Alice', city: 'NYC' } as Partial<Values> },
    });
    expect(result.current.getValue(['city'])).toBe('NYC');

    act(() => rerender({ values: { name: 'Alice', city: 'LA' } }));
    expect(result.current.getValue(['city'])).toBe('LA');
  });

  test('holds an invalid intermediate edit without snapping back while the source updates another field', ({
    expect,
  }) => {
    const { result, rerender } = renderHook(({ values }) => useFormHandler<Values>({ schema, values }), {
      initialProps: { values: { name: 'Alice', city: 'NYC' } as Partial<Values> },
    });

    // Type an invalid (empty) name. A parent that gates on validity would not persist it, so the source is unchanged.
    act(() => result.current.onValueChange(['name'], stringAst, ''));
    expect(result.current.getValue(['name'])).toBe('');
    expect(result.current.isValid).toBe(false);

    // The source updates a different field; the invalid draft must survive and the other field must update.
    act(() => rerender({ values: { name: 'Alice', city: 'LA' } }));
    expect(result.current.getValue(['name'])).toBe('');
    expect(result.current.getValue(['city'])).toBe('LA');
  });

  test('reconciles an edited field once the source catches up to the committed value', ({ expect }) => {
    const { result, rerender } = renderHook(({ values }) => useFormHandler<Values>({ schema, values }), {
      initialProps: { values: { name: 'Alice', city: 'NYC' } as Partial<Values> },
    });

    // A valid edit is held locally until the source reflects it.
    act(() => result.current.onValueChange(['name'], stringAst, 'Bob'));
    expect(result.current.getValue(['name'])).toBe('Bob');

    // Source now carries the committed value: the field reconciles and becomes valid again.
    act(() => rerender({ values: { name: 'Bob', city: 'NYC' } }));
    expect(result.current.getValue(['name'])).toBe('Bob');
    expect(result.current.isValid).toBe(true);

    // A subsequent external change to that same field is adopted (it is no longer treated as a pending edit).
    act(() => rerender({ values: { name: 'Carol', city: 'NYC' } }));
    expect(result.current.getValue(['name'])).toBe('Carol');
  });

  test('keeps an in-progress edit even when the source changes that same field (no snap-back)', ({ expect }) => {
    const { result, rerender } = renderHook(({ values }) => useFormHandler<Values>({ schema, values }), {
      initialProps: { values: { name: 'Alice', city: 'NYC' } as Partial<Values> },
    });

    // Start editing a field...
    act(() => result.current.onValueChange(['name'], stringAst, 'Bob'));
    expect(result.current.getValue(['name'])).toBe('Bob');

    // ...the source changes that same field concurrently: the in-progress edit is kept (last-writer-wins on commit),
    // while an un-edited field still adopts the source. Wholesale object swaps are handled by remounting the form.
    act(() => rerender({ values: { name: 'Dave', city: 'SF' } }));
    expect(result.current.getValue(['name'])).toBe('Bob');
    expect(result.current.getValue(['city'])).toBe('SF');
  });
});
