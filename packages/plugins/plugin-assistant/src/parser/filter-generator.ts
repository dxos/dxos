//
// Copyright 2025 DXOS.org
//

import { Filter } from '@dxos/echo';

// TODO(burdon): Factor out.

import { type Expression, type Identifier, type Literal, type RelationalOperator } from './types';

const relationalOperators: Record<RelationalOperator, (value: any) => Filter<any>> = {
  EQ: Filter.eq,
  LT: Filter.lt,
  GT: Filter.gt,
};

const specialPredicates: Record<string, (value: string) => Filter<any>> = {
  ['type' as const]: Filter.typename,
};

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
      return Filter._props({ [name]: true });
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
