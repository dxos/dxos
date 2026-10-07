//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

/** Evaluation failure carrying the parser error as its cause. */
export class InvalidExpressionError extends BaseError.extend('INVALID_EXPRESSION', 'Invalid expression') {}

/**
 * Story-local arithmetic tool, so delegation demos exercise a real (locally defined) tool call:
 * the sub-agent computes through `calculate` rather than in its head, and the invocation shows up
 * in the trace panel.
 */
export const Calculate = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.calculate'),
    name: 'Calculate',
    description: trim`
      Evaluates an arithmetic expression and returns the numeric result.
      Supports + - * / ^ ( ) and postfix ! (factorial), e.g. "10!" or "(1+2)*3".
    `,
    icon: 'ph--calculator--regular',
  },
  input: Schema.Struct({
    expression: Schema.String.annotate({ description: 'The arithmetic expression to evaluate.' }),
  }),
  output: Schema.Struct({
    result: Schema.Number,
  }),
});

/** Recursive-descent evaluator for the grammar the tool description advertises. No `eval`. */
export const evaluateExpression = (expression: string): number => {
  let position = 0;
  const input = expression.replace(/\s+/g, '');

  const fail = (reason: string): never => {
    throw new Error(`${reason} at position ${position} in "${expression}"`);
  };

  const peek = () => input[position];

  // expr := term (('+' | '-') term)*
  const parseExpr = (): number => {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = input[position++];
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  };

  // term := factor (('*' | '/') factor)*
  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = input[position++];
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  };

  // factor := unary ('^' factor)?  (right-associative)
  const parseFactor = (): number => {
    const base = parseUnary();
    if (peek() === '^') {
      position++;
      return base ** parseFactor();
    }
    return base;
  };

  // unary := '-'? postfix
  const parseUnary = (): number => {
    if (peek() === '-') {
      position++;
      return -parseUnary();
    }
    return parsePostfix();
  };

  // postfix := atom '!'*
  const parsePostfix = (): number => {
    let value = parseAtom();
    while (peek() === '!') {
      position++;
      if (!Number.isInteger(value) || value < 0) {
        fail(`factorial of non-natural number ${value}`);
      }
      // 170! is the largest finite double; a larger operand would also spin the handler.
      if (value > 170) {
        fail(`factorial operand ${value} too large (max 170)`);
      }
      let acc = 1;
      for (let i = 2; i <= value; i++) {
        acc *= i;
      }
      value = acc;
    }
    return value;
  };

  // atom := number | '(' expr ')'
  const parseAtom = (): number => {
    if (peek() === '(') {
      position++;
      const value = parseExpr();
      if (peek() !== ')') {
        fail("expected ')'");
      }
      position++;
      return value;
    }
    const match = /^\d+(\.\d+)?/.exec(input.slice(position));
    if (!match) {
      return fail('expected a number');
    }
    position += match[0].length;
    return Number(match[0]);
  };

  const value = parseExpr();
  if (position !== input.length) {
    fail(`unexpected "${input[position]}"`);
  }
  if (!Number.isFinite(value)) {
    fail(`non-finite result ${value}`);
  }
  return value;
};

const CalculateHandler = Calculate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ expression }) {
      const result = yield* Effect.try({
        try: () => evaluateExpression(expression),
        catch: (cause) => new InvalidExpressionError({ cause, context: { expression } }),
      });
      return { result };
    }),
  ),
);

export const CalculatorHandlers = OperationHandlerSet.make(CalculateHandler);

const SKILL_KEY = 'com.example.skill.calculator';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Calculator',
    description: 'Evaluates arithmetic expressions.',
    tools: Skill.toolDefinitions({ operations: [Calculate] }),
    instructions: Template.make({
      source: trim`
        {{! Calculator }}

        Perform ALL arithmetic with the calculate tool — never compute in your head. The tool
        accepts + - * / ^ ( ) and postfix ! (factorial), e.g. "10!" or "(1+2)*3".
      `,
    }),
  });

export const CalculatorSkill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};
