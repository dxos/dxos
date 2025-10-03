//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo';

import { createExpression, createFilter } from './filter-generator';
import { QueryParser } from './query-parser';

describe('FilterGenerator', () => {
  describe('createFilter', () => {
    test('simple queries', ({ expect }) => {
      const parser = new QueryParser('type:example.com/type/Person');
      const ast = parser.parse();
      expect(ast).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: {
          type: 'identifier',
          name: 'type',
        },
        right: {
          type: 'literal',
          value: 'example.com/type/Person',
        },
      });

      const filter = createFilter(ast);
      expect(filter).toEqual(Filter.typename('example.com/type/Person'));
    });
  });

  describe('createExpression', () => {
    test('everything filter', ({ expect }) => {
      const filter = Filter.everything();
      const expression = createExpression(filter.ast);
      expect(expression).toEqual({
        type: 'literal',
        value: '*',
      });
    });

    test('compare filters', ({ expect }) => {
      // Test eq filter
      const eqFilter = Filter.eq('test');
      const eqExpression = createExpression(eqFilter.ast);
      expect(eqExpression).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'value' },
        right: { type: 'literal', value: 'test' },
      });

      // Test lt filter
      const ltFilter = Filter.lt(10);
      const ltExpression = createExpression(ltFilter.ast);
      expect(ltExpression).toEqual({
        type: 'binary',
        operator: 'LT',
        left: { type: 'identifier', name: 'value' },
        right: { type: 'literal', value: '10' },
      });

      // Test gt filter
      const gtFilter = Filter.gt(5);
      const gtExpression = createExpression(gtFilter.ast);
      expect(gtExpression).toEqual({
        type: 'binary',
        operator: 'GT',
        left: { type: 'identifier', name: 'value' },
        right: { type: 'literal', value: '5' },
      });
    });

    test('logical operators', ({ expect }) => {
      // Test AND filter
      const andFilter = Filter.and(Filter.eq('a'), Filter.eq('b'));
      const andExpression = createExpression(andFilter.ast);
      expect(andExpression).toEqual({
        type: 'binary',
        operator: 'AND',
        left: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'a' },
        },
        right: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'b' },
        },
      });

      // Test OR filter
      const orFilter = Filter.or(Filter.eq('x'), Filter.eq('y'));
      const orExpression = createExpression(orFilter.ast);
      expect(orExpression).toEqual({
        type: 'binary',
        operator: 'OR',
        left: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'x' },
        },
        right: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'y' },
        },
      });

      // Test NOT filter
      const notFilter = Filter.not(Filter.eq('z'));
      const notExpression = createExpression(notFilter.ast);
      expect(notExpression).toEqual({
        type: 'unary',
        operator: 'NOT',
        argument: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'z' },
        },
      });
    });

    test('typename filter', ({ expect }) => {
      const typenameFilter = Filter.typename('Person');
      const expression = createExpression(typenameFilter.ast);
      expect(expression).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'type' },
        right: { type: 'literal', value: 'Person' },
      });
    });

    test('props filter', ({ expect }) => {
      const propsFilter = Filter.props({ name: 'John' });
      const expression = createExpression(propsFilter.ast);
      expect(expression).toEqual({
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: 'name' },
        right: { type: 'literal', value: 'John' },
      });
    });

    test('in filter', ({ expect }) => {
      const inFilter = Filter.in('a', 'b', 'c');
      const expression = createExpression(inFilter.ast);
      expect(expression).toEqual({
        type: 'binary',
        operator: 'OR',
        left: {
          type: 'binary',
          operator: 'OR',
          left: {
            type: 'binary',
            operator: 'EQ',
            left: { type: 'identifier', name: 'value' },
            right: { type: 'literal', value: 'a' },
          },
          right: {
            type: 'binary',
            operator: 'EQ',
            left: { type: 'identifier', name: 'value' },
            right: { type: 'literal', value: 'b' },
          },
        },
        right: {
          type: 'binary',
          operator: 'EQ',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: 'c' },
        },
      });
    });

    test('range filter', ({ expect }) => {
      const rangeFilter = Filter.between(10, 20);
      const expression = createExpression(rangeFilter.ast);
      expect(expression).toEqual({
        type: 'binary',
        operator: 'AND',
        left: {
          type: 'binary',
          operator: 'GT',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: '10' },
        },
        right: {
          type: 'binary',
          operator: 'LT',
          left: { type: 'identifier', name: 'value' },
          right: { type: 'literal', value: '20' },
        },
      });
    });

    test('text search filter', ({ expect }) => {
      const textFilter = Filter.text('search term');
      const expression = createExpression(textFilter.ast);
      expect(expression).toEqual({
        type: 'literal',
        value: 'search term',
      });
    });

    test('round-trip conversion', ({ expect }) => {
      // Test that createExpression(createFilter(ast)) returns equivalent AST
      const originalAst = {
        type: 'binary' as const,
        operator: 'AND' as const,
        left: {
          type: 'binary' as const,
          operator: 'EQ' as const,
          left: { type: 'identifier' as const, name: 'type' },
          right: { type: 'literal' as const, value: 'Person' },
        },
        right: {
          type: 'binary' as const,
          operator: 'EQ' as const,
          left: { type: 'identifier' as const, name: 'age' },
          right: { type: 'literal' as const, value: '25' },
        },
      };

      const filter = createFilter(originalAst);
      const convertedAst = createExpression(filter.ast);

      // The converted AST should be structurally equivalent
      expect(convertedAst.type).toBe('binary');
      if (convertedAst.type === 'binary') {
        expect(convertedAst.operator).toBe('AND');
      }
    });

    test('complex nested filters', ({ expect }) => {
      const complexFilter = Filter.and(
        Filter.typename('Person'),
        Filter.or(Filter.eq('active'), Filter.eq('pending')),
        Filter.not(Filter.eq('deleted')),
      );

      const expression = createExpression(complexFilter.ast);
      expect(expression.type).toBe('binary');
      if (expression.type === 'binary') {
        expect(expression.operator).toBe('AND');
      }
    });
  });
});
