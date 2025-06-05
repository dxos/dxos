//
// Copyright 2025 DXOS.org
//

import { Filter } from '@dxos/echo-schema';

import {
  type Expression,
  type BinaryExpression,
  type UnaryExpression,
  type Identifier,
  type Literal,
  type RelationalOperator,
} from './types';

const relationalOperators: Record<RelationalOperator, (value: any) => Filter<any>> = {
  EQ: Filter.eq,
  LT: Filter.lt,
  GT: Filter.gt,
};

const specialPredicates: Record<string, (value: string) => Filter<any>> = {
  ['type' as const]: Filter.typename,
};

export const generateFilter = (ast: Expression): Filter<any> => {
  switch (ast.type) {
    case 'binary': {
      const { operator, left, right } = ast as BinaryExpression;

      // Handle logical operators.
      if (operator === 'AND') {
        return Filter.and(generateFilter(left), generateFilter(right));
      }
      if (operator === 'OR') {
        return Filter.or(generateFilter(left), generateFilter(right));
      }

      // Handle special predicates (e.g., "type:Person")
      const predicateName = (left as Identifier).name;
      const specialFilter = specialPredicates[predicateName];
      if (specialFilter) {
        return specialFilter((right as Literal).value);
      }

      // Handle relational operators
      const filterFn = relationalOperators[operator as RelationalOperator];
      if (filterFn) {
        return filterFn((right as Literal).value);
      }

      throw new Error(`Unsupported operator: ${operator}`);
    }

    case 'unary': {
      const { operator, argument } = ast as UnaryExpression;
      if (operator === 'NOT') {
        return Filter.not(generateFilter(argument));
      }
      throw new Error(`Unsupported unary operator: ${operator}`);
    }

    case 'identifier': {
      const { name } = ast as Identifier;
      return Filter._props({ [name]: true });
    }

    case 'literal': {
      const { value } = ast as Literal;
      return Filter.eq(value);
    }

    default:
      throw new Error(`Unsupported expression type: ${(ast as any).type}`);
  }
};
