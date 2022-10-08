//
// Copyright 2022 DXOS.org
//

import { CallExpression, Expression, Import, Plugin, Program, Span, Super, transformSync, TsType } from '@swc/core';
import Visitor from '@swc/core/Visitor';

export const preprocess = (code: string, filename: string) => {
  return transformSync(code, {
    sourceMaps: true,
    inlineSourcesContent: true,
    sourceFileName: filename,
    plugin: (m) => new TraceInjector(filename, code).visitProgram(m),
    jsc: {
      target: 'es2022',
      parser: {
        syntax: 'typescript',
        decorators: true
      }
    }
  });
};

type GlobalPluginOpts = {
  fileName: string,
  input: string
}

declare global {
  const SWC_PLUGIN: ((opts: GlobalPluginOpts) => Plugin) | undefined;
}

export function registerGlobalPlugin() {
  // This will be called by the patched ts-node/esm loader.
  (global as any).SWC_PLUGIN = ({ fileName, input }: GlobalPluginOpts): Plugin =>
    (m) => new TraceInjector(fileName, input).visitProgram(m);
}

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
    if (
      isLoggerFuncExpression(n.callee) ||
      (n.callee.type === 'MemberExpression' && isLoggerFuncExpression(n.callee.object))
    ) {
      // Matches expressions of form:
      // log(...)
      // log.<level>(...)

      if (n.arguments.length === 1) {
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
          expression: {
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
                  type: 'StringLiteral',
                  value: this.filename,
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

                  value: this._getLineAndColumn(n.span.start - this.programSpan.start + this.spanOffset).line,
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
        });
      }

      return n;
    } else {
      return super.visitCallExpression(n);
    }
  }
}

const isLoggerFuncExpression =
  (e: Expression | Super | Import) => e.type === 'Identifier' && e.value === 'log';
