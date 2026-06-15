//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import {
  extractDxnsFromObject,
  extractDxnFromString,
  extractFirstDxnFromToolInput,
  extractFirstDxnFromToolResult,
} from './dxn-extractor';

describe('dxn-extractor', () => {
  describe('extractDxnFromString', () => {
    test('extracts plain DXN from string', ({ expect }) => {
      const result = extractDxnFromString('Found object echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts @-prefixed reference from string', ({ expect }) => {
      const result = extractDxnFromString('Reference to @echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4 in text');
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts multiple references from string', ({ expect }) => {
      const result = extractDxnFromString(
        'Objects: echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4 and @echo://BBBBBBBBBBBBBBBBBBBBBBBBBB/01KG7R1ZXWFMWQ4DA1Q6TN1DG5',
      );
      expect(result).toHaveLength(2);
    });

    test('deduplicates DXNs', ({ expect }) => {
      const result = extractDxnFromString(
        'Same object echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4 and echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      );
      expect(result).toHaveLength(1);
    });

    test('returns empty array for string without DXNs', ({ expect }) => {
      const result = extractDxnFromString('No DXNs here');
      expect(result).toHaveLength(0);
    });
  });

  describe('extractDxnsFromObject', () => {
    test('extracts IPLD-style reference { "/": "echo:..." }', ({ expect }) => {
      const result = extractDxnsFromObject({
        '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts @uri key reference { "@uri": "echo:..." }', ({ expect }) => {
      const result = extractDxnsFromObject({
        '@uri': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
        name: 'Test',
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts reference block { _tag: "reference", reference: { uri: ... } }', ({ expect }) => {
      const result = extractDxnsFromObject({
        _tag: 'reference',
        reference: {
          uri: 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts DXN from nested object', ({ expect }) => {
      const result = extractDxnsFromObject({
        data: {
          items: [
            {
              ref: { '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
            },
          ],
        },
      });
      expect(result).toHaveLength(1);
    });

    test('extracts DXN from string property', ({ expect }) => {
      const result = extractDxnsFromObject({
        message: 'Created object echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
      });
      expect(result).toHaveLength(1);
    });

    test('extracts DXN from array', ({ expect }) => {
      const result = extractDxnsFromObject([
        { '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
        { '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG5' },
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
        objectRef: { '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
      });
      const result = extractFirstDxnFromToolInput(input);
      expect(result?.toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
    });

    test('extracts DXN from invalid JSON string', ({ expect }) => {
      const input = 'Invalid JSON but contains echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4';
      const result = extractFirstDxnFromToolInput(input);
      expect(result?.toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
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
        created: { '/': 'echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4' },
      });
      const dxn = extractFirstDxnFromToolResult(result);
      expect(dxn?.toString()).toBe('echo:/01KG7R1ZXWFMWQ4DA1Q6TN1DG4');
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
