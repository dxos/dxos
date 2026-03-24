//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';


import {
  extractDxnsFromObject,
  extractDxnsFromString,
  extractFirstDxnFromToolInput,
  extractFirstDxnFromToolResult,
} from './dxn-extractor';

describe('dxn-extractor', () => {
  describe('extractDxnsFromString', () => {
    test('extracts plain DXN from string', ({ expect }) => {
      const result = extractDxnsFromString('Found object dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts @dxn prefixed reference from string', ({ expect }) => {
      const result = extractDxnsFromString('Reference to @dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4 in text');
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts multiple DXNs from string', ({ expect }) => {
      const result = extractDxnsFromString(
        'Objects: dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4 and @dxn:queue:data:SPACE:QUEUE:01KG7R1ZXWFMWQ4DA1Q6TN1DG5',
      );
      expect(result).toHaveLength(2);
    });

    test('deduplicates DXNs', ({ expect }) => {
      const result = extractDxnsFromString(
        'Same object dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4 and dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      );
      expect(result).toHaveLength(1);
    });

    test('returns empty array for string without DXNs', ({ expect }) => {
      const result = extractDxnsFromString('No DXNs here');
      expect(result).toHaveLength(0);
    });
  });

  describe('extractDxnsFromObject', () => {
    test('extracts IPLD-style reference { "/": "dxn:..." }', ({ expect }) => {
      const result = extractDxnsFromObject({
        '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts @dxn key reference { "@dxn": "dxn:..." }', ({ expect }) => {
      const result = extractDxnsFromObject({
        '@dxn': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
        name: 'Test',
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts reference block { _tag: "reference", reference: { dxn: ... } }', ({ expect }) => {
      const result = extractDxnsFromObject({
        _tag: 'reference',
        reference: {
          dxn: 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts DXN from nested object', ({ expect }) => {
      const result = extractDxnsFromObject({
        data: {
          items: [
            {
              ref: { '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
            },
          ],
        },
      });
      expect(result).toHaveLength(1);
    });

    test('extracts DXN from string property', ({ expect }) => {
      const result = extractDxnsFromObject({
        message: 'Created object dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      });
      expect(result).toHaveLength(1);
    });

    test('extracts DXN from array', ({ expect }) => {
      const result = extractDxnsFromObject([
        { '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
        { '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG5' },
      ]);
      expect(result).toHaveLength(2);
    });

    test('handles null and undefined', ({ expect }) => {
      expect(extractDxnsFromObject(null)).toHaveLength(0);
      expect(extractDxnsFromObject(undefined)).toHaveLength(0);
    });
  });

  describe('extractFirstDxnFromToolInput', () => {
    test('extracts DXN from JSON tool input', ({ expect }) => {
      const input = JSON.stringify({
        objectRef: { '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
      });
      const result = extractFirstDxnFromToolInput(input);
      expect(result?.toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts DXN from invalid JSON string', ({ expect }) => {
      const input = 'Invalid JSON but contains dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4';
      const result = extractFirstDxnFromToolInput(input);
      expect(result?.toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('returns undefined for input without DXNs', ({ expect }) => {
      const input = JSON.stringify({ name: 'Test' });
      const result = extractFirstDxnFromToolInput(input);
      expect(result).toBeUndefined();
    });
  });

  describe('extractFirstDxnFromToolResult', () => {
    test('extracts DXN from JSON tool result', ({ expect }) => {
      const result = JSON.stringify({
        created: { '/': 'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
      });
      const dxn = extractFirstDxnFromToolResult(result);
      expect(dxn?.toString()).toBe('dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('returns undefined for undefined result', ({ expect }) => {
      const dxn = extractFirstDxnFromToolResult(undefined);
      expect(dxn).toBeUndefined();
    });

    test('returns undefined for result without DXNs', ({ expect }) => {
      const result = JSON.stringify({ success: true });
      const dxn = extractFirstDxnFromToolResult(result);
      expect(dxn).toBeUndefined();
    });
  });
});
