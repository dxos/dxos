//
// Copyright 2025 DXOS.org
//

import { Filter, type QueryAST } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { type Expression, type Identifier, type Literal, type RelationalOperator } from './types';

const relationalOperators: Record<RelationalOperator, (value: any) => Filter<any>> = {
  EQ: Filter.eq,
  LT: Filter.lt,
  GT: Filter.gt,
};

const specialPredicates: Record<string, (value: string) => Filter<any>> = {
  ['type' as const]: Filter.typename,
};

/**
 * @deprecated
 */
export const createFilter = (ast: Expression): Filter<any> => {
  switch (ast.type) {
    case 'binary': {
      const { operator, left, right } = ast;

      // Handle logical operators.
      if (operator === 'AND') {
        return Filter.and(createFilter(left), createFilter(right));
      }
      if (operator === 'OR') {
        return Filter.or(createFilter(left), createFilter(right));
      }

      // Handle special predicates (e.g., "type:Person")
      const predicateName = (left as Identifier).name;
      const specialFilter = specialPredicates[predicateName];
      if (specialFilter) {
        return specialFilter((right as Literal).value);
      }

      // Handle relational operators
      const filterFn = relationalOperators[operator];
      if (filterFn) {
        return filterFn((right as Literal).value);
      }

      throw new Error(`Unsupported operator: ${operator}`);
    }

    case 'unary': {
      const { operator, argument } = ast;
      if (operator === 'NOT') {
        return Filter.not(createFilter(argument));
      }
      throw new Error(`Unsupported unary operator: ${operator}`);
    }

    case 'identifier': {
      const { name } = ast;
      return Filter.props({ [name]: true });
    }

    case 'literal': {
      const { value } = ast;
      // Handle special '*' value for empty input.
      if (value === '*') {
        return Filter.everything();
      }

      return Filter.eq(value);
    }

    default:
      throw new Error(`Unsupported expression type: ${(ast as any).type}`);
  }
};

// Helper function to reduce expressions with binary operators
const reduceExpressions = (expressions: Expression[], operator: 'AND' | 'OR'): Expression => {
  return expressions.reduce((left: Expression, right: Expression) => ({
    type: 'binary' as const,
    operator,
    left,
    right,
  }));
};

// Helper function to create expression from AST directly
export const createExpression = (ast: QueryAST.Filter): Expression => {
  switch (ast.type) {
    case 'compare': {
      const { operator, value } = ast;
      const operatorMap: Record<string, RelationalOperator> = {
        eq: 'EQ',
        lt: 'LT',
        gt: 'GT',
      };

      const mappedOperator = operatorMap[operator];
      if (mappedOperator) {
        return {
          type: 'binary' as const,
          operator: mappedOperator,
          left: { type: 'identifier' as const, name: 'value' },
          right: { type: 'literal' as const, value: String(value) },
        };
      }
      throw new Error(`Unsupported compare operator: ${operator}`);
    }

    case 'and': {
      const expressions = ast.filters.map((f) => createExpression(f));
      return reduceExpressions(expressions, 'AND');
    }

    case 'or': {
      const expressions = ast.filters.map((f) => createExpression(f));
      return reduceExpressions(expressions, 'OR');
    }

    case 'not': {
      return {
        type: 'unary' as const,
        operator: 'NOT' as const,
        argument: createExpression(ast.filter),
      };
    }

    case 'object': {
      // Handle object filters with typename
      if (ast.typename) {
        // Extract the typename from the DXN string
        const dxn = DXN.parse(ast.typename);
        const typeDXN = dxn.asTypeDXN();
        const typename = typeDXN?.type ?? ast.typename;

        return {
          type: 'binary' as const,
          operator: 'EQ' as const,
          left: { type: 'identifier' as const, name: 'type' },
          right: { type: 'literal' as const, value: typename },
        };
      }

      // Handle object filters with properties
      if (ast.props && Object.keys(ast.props).length > 0) {
        const propEntries = Object.entries(ast.props);
        if (propEntries.length === 1) {
          const [propName, propFilter] = propEntries[0];
          if (typeof propFilter === 'object' && propFilter !== null && 'type' in propFilter) {
            // Handle nested filter AST directly - extract value for compare filters
            if (propFilter.type === 'compare' && propFilter.operator === 'eq') {
              return {
                type: 'binary' as const,
                operator: 'EQ' as const,
                left: { type: 'identifier' as const, name: propName },
                right: { type: 'literal' as const, value: String(propFilter.value) },
              };
            } else {
              return {
                type: 'binary' as const,
                operator: 'EQ' as const,
                left: { type: 'identifier' as const, name: propName },
                right: createExpression(propFilter),
              };
            }
          } else {
            // Simple value
            return {
              type: 'binary' as const,
              operator: 'EQ' as const,
              left: { type: 'identifier' as const, name: propName },
              right: { type: 'literal' as const, value: String(propFilter) },
            };
          }
        } else {
          // Multiple properties - create AND expression
          const expressions = propEntries.map(([propName, propFilter]) => {
            if (typeof propFilter === 'object' && propFilter !== null && 'type' in propFilter) {
              // Handle nested filter AST directly - extract value for compare filters
              if (propFilter.type === 'compare' && propFilter.operator === 'eq') {
                return {
                  type: 'binary' as const,
                  operator: 'EQ' as const,
                  left: { type: 'identifier' as const, name: propName },
                  right: { type: 'literal' as const, value: String(propFilter.value) },
                };
              } else {
                return {
                  type: 'binary' as const,
                  operator: 'EQ' as const,
                  left: { type: 'identifier' as const, name: propName },
                  right: createExpression(propFilter),
                };
              }
            } else {
              return {
                type: 'binary' as const,
                operator: 'EQ' as const,
                left: { type: 'identifier' as const, name: propName },
                right: { type: 'literal' as const, value: String(propFilter) },
              };
            }
          });
          return reduceExpressions(expressions, 'AND');
        }
      }

      // Empty object filter (everything)
      return {
        type: 'literal' as const,
        value: '*',
      };
    }

    case 'text-search': {
      return {
        type: 'literal' as const,
        value: ast.text,
      };
    }

    case 'in': {
      // Convert 'in' filter to OR of equality checks
      const expressions = ast.values.map((value: any) => ({
        type: 'binary' as const,
        operator: 'EQ' as const,
        left: { type: 'identifier' as const, name: 'value' },
        right: { type: 'literal' as const, value: String(value) },
      }));
      return reduceExpressions(expressions, 'OR');
    }

    case 'range': {
      // Convert range to AND of GT and LT
      const gtExpr = {
        type: 'binary' as const,
        operator: 'GT' as const,
        left: { type: 'identifier' as const, name: 'value' },
        right: { type: 'literal' as const, value: String(ast.from) },
      };
      const ltExpr = {
        type: 'binary' as const,
        operator: 'LT' as const,
        left: { type: 'identifier' as const, name: 'value' },
        right: { type: 'literal' as const, value: String(ast.to) },
      };
      return {
        type: 'binary' as const,
        operator: 'AND' as const,
        left: gtExpr,
        right: ltExpr,
      };
    }

    default:
      throw new Error(`Unsupported AST type: ${(ast as any).type}`);
  }
};
