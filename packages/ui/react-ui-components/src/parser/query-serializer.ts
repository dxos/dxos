//
// Copyright 2025 DXOS.org
//

import {
  type BinaryExpression,
  type BinaryOperator,
  type Expression,
  type Literal,
  type RelationalOperator,
  type RelationalSymbol,
  type UnaryExpression,
} from './types';

const operators: Record<RelationalOperator, RelationalSymbol> = {
  EQ: '=',
  LT: '<',
  GT: '>',
};

/**
 * Serializes an Expression AST back into a string query.
 * This is the inverse operation of QueryParser.parse().
 * @deprecated
 */
export class QuerySerializer {
  /**
   * Serializes an Expression AST to a string query.
   */
  public serialize(expression: Expression): string {
    return this.serializeExpression(expression);
  }

  private serializeExpression(expression: Expression): string {
    switch (expression.type) {
      case 'binary':
        return this.serializeBinaryExpression(expression);
      case 'unary':
        return this.serializeUnaryExpression(expression);
      case 'identifier':
        return expression.name;
      case 'literal':
        return this.serializeLiteral(expression);
      default:
        throw new Error(`Unknown expression type: ${(expression as any).type}`);
    }
  }

  private serializeBinaryExpression(expression: BinaryExpression): string {
    const { operator, left, right } = expression;

    // Handle special case for type:value expressions
    if (this.isTypeExpression(left, right, operator)) {
      return `${(left as any).name}:${(right as any).value}`;
    }

    // Handle field operator value expressions
    if (this.isFieldExpression(left, right, operator)) {
      const field = (left as any).name;
      const value = this.serializeLiteral(right as Literal);
      const opSymbol = operators[operator as RelationalOperator];
      return `${field} ${opSymbol} ${value}`;
    }

    // Handle logical operators (AND, OR)
    if (operator === 'AND' || operator === 'OR') {
      const leftStr = this.serializeExpression(left);
      const rightStr = this.serializeExpression(right);

      // Add parentheses around OR expressions when they're part of an AND expression
      if (operator === 'AND' && right.type === 'binary' && right.operator === 'OR') {
        return `${leftStr} ${operator} (${rightStr})`;
      }

      return `${leftStr} ${operator} ${rightStr}`;
    }

    // Handle relational operators in general case
    const leftStr = this.serializeExpression(left);
    const rightStr = this.serializeExpression(right);
    const opSymbol = operators[operator as RelationalOperator];
    return `${leftStr} ${opSymbol} ${rightStr}`;
  }

  private serializeUnaryExpression(expression: UnaryExpression): string {
    const { operator, argument } = expression;

    if (operator === 'NOT') {
      const argStr = this.serializeExpression(argument);
      // Only add parentheses if the argument is a complex binary expression (AND/OR)
      if (argument.type === 'binary' && (argument.operator === 'AND' || argument.operator === 'OR')) {
        return `NOT (${argStr})`;
      }
      return `NOT ${argStr}`;
    }

    throw new Error(`Unknown unary operator: ${operator}`);
  }

  private serializeLiteral(literal: Literal): string {
    const { value } = literal;

    // Handle special wildcard case
    if (value === '*') {
      return value;
    }

    // Quote the value if it contains spaces or special characters
    if (this.needsQuoting(value)) {
      return `"${value}"`;
    }

    return value;
  }

  private isTypeExpression(left: Expression, right: Expression, operator: BinaryOperator): boolean {
    return left.type === 'identifier' && right.type === 'literal' && operator === 'EQ' && left.name === 'type';
  }

  private isFieldExpression(left: Expression, right: Expression, operator: BinaryOperator): boolean {
    return (
      left.type === 'identifier' &&
      right.type === 'literal' &&
      (operator === 'EQ' || operator === 'LT' || operator === 'GT') &&
      left.name.startsWith('$')
    );
  }

  private needsQuoting(value: string): boolean {
    // Quote if contains spaces, parentheses, or operators
    return /[\s()=<>]/.test(value);
  }
}
