//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EditorSelectionStateSchema } from './selection';

describe('EditorSelectionStateSchema', () => {
  test('encode/decode preserves the legacy serialized shape', ({ expect }) => {
    const value = { scrollTo: 42, selection: { anchor: 3, head: 9 } };
    const encoded = Schema.encodeSync(EditorSelectionStateSchema)(value);
    expect(encoded).toEqual(value);
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)(JSON.parse(JSON.stringify(encoded)))).toEqual(value);
  });

  test('accepts an empty state', ({ expect }) => {
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)({})).toEqual({});
  });

  test('accepts selection without head', ({ expect }) => {
    const value = { selection: { anchor: 5 } };
    expect(Schema.decodeUnknownSync(EditorSelectionStateSchema)(value)).toEqual(value);
  });
});
