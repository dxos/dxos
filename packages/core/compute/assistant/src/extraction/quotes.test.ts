//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { insertReferences } from './quotes';

describe('insertReferences', () => {
  test('should replace quotes with DXN references', () => {
    const quotes = {
      references: [{ quote: 'computational irreducibility', id: '01JTG9JW11XGWJZ32AW8ET93D1' }],
    };

    expect(insertReferences('This is a computational irreducibility test.', quotes)).toBe(
      'This is a [computational irreducibility](dxn:echo:@:01JTG9JW11XGWJZ32AW8ET93D1) test.',
    );
    expect(
      insertReferences(
        "And what I'd like to talk today about is Steven Wolfram's concept of a computational irreducibility.",
        quotes,
      ),
    ).toBe(
      "And what I'd like to talk today about is Steven Wolfram's concept of a [computational irreducibility](dxn:echo:@:01JTG9JW11XGWJZ32AW8ET93D1).",
    );
  });
});
