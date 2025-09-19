//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { QueryParser } from './query-parser';
import { QuerySerializer } from './query-serializer';
import { type Expression } from './types';

describe('QuerySerializer', () => {
  const serializer = new QuerySerializer();

  test('serializes simple type expressions', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'EQ',
      left: { type: 'identifier', name: 'type' },
      right: { type: 'literal', value: 'Person' },
    };

    expect(serializer.serialize(expression)).toBe('type:Person');
  });

  test('serializes field expressions', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'EQ',
      left: { type: 'identifier', name: '$name' },
      right: { type: 'literal', value: 'John' },
    };

    expect(serializer.serialize(expression)).toBe('$name = John');
  });

  test('serializes field expressions with operators', () => {
    const ltExpression: Expression = {
      type: 'binary',
      operator: 'LT',
      left: { type: 'identifier', name: '$age' },
      right: { type: 'literal', value: '30' },
    };

    const gtExpression: Expression = {
      type: 'binary',
      operator: 'GT',
      left: { type: 'identifier', name: '$score' },
      right: { type: 'literal', value: '100' },
    };

    expect(serializer.serialize(ltExpression)).toBe('$age < 30');
    expect(serializer.serialize(gtExpression)).toBe('$score > 100');
  });

  test('serializes AND expressions', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'AND',
      left: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Person' },
      },
      right: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: '$age' },
        right: { type: 'literal', value: '25' },
      },
    };

    expect(serializer.serialize(expression)).toBe('type:Person AND $age = 25');
  });

  test('serializes OR expressions', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'OR',
      left: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Person' },
      },
      right: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Organization' },
      },
    };

    expect(serializer.serialize(expression)).toBe('type:Person OR type:Organization');
  });

  test('serializes NOT expressions', () => {
    const expression: Expression = {
      type: 'unary',
      operator: 'NOT',
      argument: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Person' },
      },
    };

    expect(serializer.serialize(expression)).toBe('NOT type:Person');
  });

  test('serializes complex nested expressions', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'AND',
      left: {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Person' },
      },
      right: {
        type: 'binary',
        operator: 'OR',
        left: {
          type: 'binary',
          operator: 'LT',
          left: { type: 'identifier', name: '$age' },
          right: { type: 'literal', value: '30' },
        },
        right: {
          type: 'binary',
          operator: 'GT',
          left: { type: 'identifier', name: '$score' },
          right: { type: 'literal', value: '100' },
        },
      },
    };

    expect(serializer.serialize(expression)).toBe('type:Person AND ($age < 30 OR $score > 100)');
  });

  test('serializes literals with proper quoting', () => {
    const expression: Expression = {
      type: 'binary',
      operator: 'EQ',
      left: { type: 'identifier', name: '$name' },
      right: { type: 'literal', value: 'John Doe' },
    };

    expect(serializer.serialize(expression)).toBe('$name = "John Doe"');
  });

  test('serializes wildcard literals', () => {
    const expression: Expression = {
      type: 'literal',
      value: '*',
    };

    expect(serializer.serialize(expression)).toBe('*');
  });

  test('round-trip serialization', () => {
    const testQueries = [
      'type:Person',
      '$name = John',
      '$age < 30',
      'type:Person AND $age = 25',
      'type:Person OR type:Organization',
      'NOT type:Person',
      'type:Person AND ($age < 30 OR $score > 100)',
      '$name = "John Doe"',
    ];

    for (const query of testQueries) {
      const parser = new QueryParser(query);
      const expression = parser.parse();
      const serialized = serializer.serialize(expression);

      // For round-trip testing, we need to be more flexible about exact string matching
      // since the parser and serializer might handle whitespace differently
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();
      const normalizedSerialized = serialized.replace(/\s+/g, ' ').trim();

      expect(normalizedSerialized).toBe(normalizedQuery);
    }
  });
});
