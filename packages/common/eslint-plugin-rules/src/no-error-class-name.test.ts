//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/no-error-class-name.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('no-error-class-name', () => {
  it('reports identity checks on the minified class name', () => {
    ruleTester.run('no-error-class-name', rule, {
      valid: [
        "registerError('UnknownProtocolError', decode);",
        'if (TimeoutError.is(err)) {}',
        "if (err.name === 'TimeoutError') {}",
        // Non-error classes and built-ins are out of scope.
        'log(Foo.name);',
        "if (value.constructor.name === 'ArrayBuffer') {}",
      ],
      invalid: [
        {
          code: 'registerError(UnknownProtocolError.name, decode);',
          errors: [{ messageId: 'errorClassName' }],
        },
        {
          code: 'new Set([EchoError.EntityNotFoundError.name]);',
          errors: [{ messageId: 'errorClassName' }],
        },
        {
          code: "if (err.constructor.name === 'TimeoutError') {}",
          errors: [{ messageId: 'constructorName' }],
        },
        {
          code: "if ('TimeoutError' !== err?.constructor.name) {}",
          errors: [{ messageId: 'constructorName' }],
        },
      ],
    });
  });
});
