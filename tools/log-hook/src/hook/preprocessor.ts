//
// Copyright 2022 DXOS.org
//

import { CallExpression, Expression, Import, Program, Span, Super, transformSync, TsType } from '@swc/core';
import Visitor from '@swc/core/Visitor';

export const preprocess = (code: string, filename: string) => {
  return transformSync(code, {
    // will emit the source map as a separate property of the output.
    sourceMaps: true,
    // ???
    inlineSourcesContent: true,
    sourceFileName: filename,
    plugin: (m) => new TraceInjector(filename, code).visitProgram(m),
    jsc: {
      // Does not seem to work.
      preserveAllComments: true,
      minify: {
        compress: false,
        format: {
          // Does not seem to preserve comments.
          comments: 'all',
        },
        mangle: false,
      },
      target: 'es2022',
      parser: {
        syntax: 'typescript',
        decorators: true
      }
    }
  });
};

const ZERO_SPAN: Span = { ctxt: 0, end: 0, start: 0 };

export const ID_GET_CURRENT_OWNERSHIP_SCOPE = 'dxlog_getCurrentOwnershipScope';
export const ID_BUGCHECK_STRING = 'dxlog_bugcheckString';

class TraceInjector extends Visitor {
  programSpan!: Span;
  spanOffset = 0;
  private _linePositions: number[] = [];
  constructor (
    private readonly filename: string,
    private readonly code: string
  ) {
    super();

    this._linePositions.push(0);
    for (let i = 0; i < code.length; i++) {
      if (code[i] === '\n') {
        this._linePositions.push(i + 1);
      }
    }
  }

  private _getLineAndColumn (position: number) {
    let line = this._linePositions.findIndex((linePosition) => linePosition > position);
    if (line === -1) {
      line = this._linePositions.length;
    }
    const column = position - this._linePositions[line - 1];
    return { line, column };
  }

  override visitTsType (n: TsType) {
    return n;
  }

  override visitProgram (node: Program) {
    this.spanOffset = this.code.indexOf('import');
    if (this.spanOffset === -1) {
      this.spanOffset = 0;
    }

    this.programSpan = node.span;
    return super.visitProgram(node);
  }

  override visitCallExpression (n: CallExpression): Expression {
    if (isLoggerInvocation(n)) {
      if (n.arguments.length === 1) {
        // Add empty context.
        n.arguments.push({
          expression: {
            type: 'ObjectExpression',
            properties: [],
            span: ZERO_SPAN
          }
        });
      }

      if (n.arguments.length === 2) {
        n.arguments.push({
          expression: this._createMetadataExpression(n.span),
        });
      }

      return n;
    } else {
      return super.visitCallExpression(n);
    }
  }

  private _createMetadataExpression(span: Span): Expression {
    return {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'KeyValueProperty',
          key: {
            type: 'Identifier',
            value: 'file',
            optional: false,
            span: ZERO_SPAN
          },
          value: {
            type: 'Identifier',
            value: '__filename',
            optional: false,
            span: ZERO_SPAN
          }
        },
        {
          type: 'KeyValueProperty',
          key: {
            type: 'Identifier',
            value: 'line',
            optional: false,
            span: ZERO_SPAN
          },
          value: {
            type: 'NumericLiteral',

            value: this._getLineAndColumn(span.start - this.programSpan.start + this.spanOffset).line,
            span: ZERO_SPAN
          }
        },
        {
          type: 'KeyValueProperty',
          key: {
            type: 'Identifier',
            value: 'ownershipScope',
            optional: false,
            span: ZERO_SPAN
          },
          value: {
            type: 'CallExpression',
            callee: {
              type: 'Identifier',
              value: ID_GET_CURRENT_OWNERSHIP_SCOPE,
              optional: false,
              span: ZERO_SPAN
            },
            arguments: [{
              expression: {
                type: 'ThisExpression',
                span: ZERO_SPAN
              }
            }],
            span: ZERO_SPAN
          }
        },
        {
          type: 'KeyValueProperty',
          key: {
            type: 'Identifier',
            value: 'bugcheck',
            optional: false,
            span: ZERO_SPAN
          },
          value: {
            type: 'Identifier',
            value: ID_BUGCHECK_STRING,
            optional: false,
            span: ZERO_SPAN
          }
        }
      ],
      span: ZERO_SPAN
    }
  }
}


/**
 * Matches expressions of form:
 *   log(...)
 *   log.<level>(...)
 *   (0, <ident>.log)(...)
 */
const isLoggerInvocation = (e: CallExpression) =>
  isLoggerFuncExpression(e.callee) ||
  (e.callee.type === 'MemberExpression' && isLoggerFuncExpression(e.callee.object))

const isLoggerFuncExpression =
  (e: Expression | Super | Import) =>
    e.type === 'Identifier' && e.value === 'log' ||
    isCjsImportedLoggerExpression(e) || (
      e.type === 'ParenthesisExpression' && e.expression.type === 'SequenceExpression' && e.expression.expressions.length === 2  &&
      e.expression.expressions[0].type === 'NumericLiteral' && e.expression.expressions[0].value === 0 &&
      isCjsImportedLoggerExpression(e.expression.expressions[1])
    )

const isCjsImportedLoggerExpression = (e: Expression | Super | Import) =>
  e.type === 'MemberExpression' &&
  e.object.type === 'Identifier' &&
  e.object.value !== 'console' && e.object.value !== 'debug' &&
  e.property.type === 'Identifier' &&
  e.property.value === 'log'