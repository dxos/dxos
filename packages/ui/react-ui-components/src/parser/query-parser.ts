//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type BinaryOperator, type Expression, type RelationalOperator, type RelationalSymbol } from './types';

// TODO(burdon): Move to echo-schema?

const operators: Record<RelationalSymbol, RelationalOperator> = {
  '=': 'EQ',
  '<': 'LT',
  '>': 'GT',
};

/**
 * @deprecated
 */
export class QueryParser {
  private tokens: string[] = [];
  private current = 0;

  constructor(input: string) {
    // Tokenize the input string.
    this.tokens = this.tokenize(input);
  }

  private tokenize(input: string): string[] {
    // Handle empty input.
    if (!input.trim()) {
      return [];
    }

    // Split on spaces but preserve quoted strings.
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (char === '"') {
        // Handle quoted strings.
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '(' || char === ')') {
        // If we have accumulated tokens, add them first.
        if (current) {
          tokens.push(current);
          current = '';
        }
        // Add the parenthesis as a separate token.
        tokens.push(char);
      } else if (operators[char as RelationalSymbol]) {
        // If we have accumulated tokens, add them first.
        if (current) {
          tokens.push(current);
          current = '';
        }
        // Add the operator as a separate token.
        tokens.push(operators[char as RelationalSymbol]);
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  private peek(): string {
    return this.tokens[this.current];
  }

  private advance(): string {
    return this.tokens[this.current++];
  }

  private match(type: string): boolean {
    if (this.peek() === type) {
      this.advance();
      return true;
    }
    return false;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private parseExpression(): Expression {
    let expr = this.parseTerm();

    while (!this.isAtEnd()) {
      const operator = this.peek();
      if (operator === 'AND' || operator === 'OR') {
        this.advance();
        const right = this.parseTerm();
        expr = {
          type: 'binary',
          operator: operator as BinaryOperator,
          left: expr,
          right,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseTerm(): Expression {
    // Handle NOT operator
    if (this.peek() === 'NOT') {
      this.advance();
      const argument = this.parseTerm();
      return {
        type: 'unary',
        operator: 'NOT',
        argument,
      };
    }

    // Handle parentheses.
    if (this.match('(')) {
      const expr = this.parseExpression();
      if (!this.match(')')) {
        throw new Error('Expected closing parenthesis');
      }
      return expr;
    }

    const token = this.peek();

    // Handle type:Person style expressions.
    if (token.includes(':')) {
      const [field, value] = token.split(':');
      this.advance();
      if (!field || !value) {
        throw new Error(`Invalid type expression: ${token}`);
      }

      return {
        type: 'binary',
        operator: 'EQ',
        left: { type: 'identifier', name: field },
        right: { type: 'literal', value },
      };
    }

    // Handle $field expressions with operators.
    if (token.startsWith('$')) {
      const field = token;
      this.advance();

      // Get the operator.
      const operator = this.peek();
      if (operator !== 'EQ' && operator !== 'LT' && operator !== 'GT') {
        throw new Error(`Expected operator after field ${field}, got ${operator}`);
      }
      this.advance();

      // Get the value
      const value = this.peek();
      this.advance();
      invariant(value);

      return {
        type: 'binary',
        operator: operator as BinaryOperator,
        left: { type: 'identifier', name: field },
        right: { type: 'literal', value: value.replace(/^"|"$/g, '') },
      };
    }

    throw new Error(`Unexpected token: ${token}`);
  }

  public parse(): Expression {
    // Return a special expression for empty input.
    if (this.tokens.length === 0) {
      return {
        type: 'literal',
        value: '*',
      };
    }

    return this.parseExpression();
  }
}
