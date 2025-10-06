//
// Copyright 2025 DXOS.org
//

export type UnaryOperator = 'NOT';

export type RelationalOperator = 'EQ' | 'LT' | 'GT';

export type BinaryOperator = RelationalOperator | 'AND' | 'OR';

export type Expression = BinaryExpression | UnaryExpression | Identifier | Literal;

export interface BinaryExpression {
  type: 'binary';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: 'unary';
  operator: UnaryOperator;
  argument: Expression;
}

export interface Identifier {
  type: 'identifier';
  name: string;
}

export interface Literal {
  type: 'literal';
  value: string;
}

export type RelationalSymbol = '=' | '<' | '>';
