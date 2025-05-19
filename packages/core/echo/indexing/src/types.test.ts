import { describe, expect, test } from 'vitest';
import { EscapedPropPath } from './types';

describe('EscapedPropPath', () => {
  const CASES: [string[], string][] = [
    [['a'], 'a'] as const,
    [['a', 'b'], 'a.b'] as const,
    [['a', 'b', 'c'], 'a.b.c'] as const,
    [['a.b'], 'a\\.b'] as const,
    [['a.', 'b'], 'a\\..b'] as const,
    [['a\\b'], 'a\\\\b'] as const,
    [['\\a'], '\\\\a'] as const,
  ];

  test('should escape and unescape', () => {
    for (const [path, expectedEscaped] of CASES) {
      const escaped = EscapedPropPath.escape(path);
      expect(escaped).toBe(expectedEscaped);
      const unescaped = EscapedPropPath.unescape(escaped);
      expect(unescaped).toEqual(path);
    }
  });
});
