import { Argument, ArrowFunctionExpression, AssignmentExpression, BlockStatement, CallExpression, ClassMember, ClassMethod, ComputedPropName, Declaration, Expression, Fn, FunctionDeclaration, Identifier, Import, MemberExpression, Module, ParenthesisExpression, PrivateName, Program, ReturnStatement, SequenceExpression, Span, Statement, Super, transformSync, TsType, UpdateExpression } from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";

export function preprocess(code: string, filename: string) {
  return transformSync(code, {
    // sourceMaps: true,
    // sourceFileName: filename,
    plugin: (m) => new TraceInjector(filename).visitProgram(m),
    jsc: {
      target: 'es2022',
      parser: {
        syntax: 'typescript',
        decorators: true,
      }
    },
  });
}

const ZERO_SPAN: Span = { ctxt: 0, end: 0, start: 0 };

export const ID_GET_CURRENT_OWNERSHIP_SCOPE = 'dxlog_getCurrentOwnershipScope';
export const ID_BUGCHECK_STRING = 'dxlog_bugcheckString';

class TraceInjector extends Visitor {
  programSpan!: Span
  constructor(
    private readonly filename: string,
  ) {
    super()
  }

  override visitTsType(n: TsType) {
    return n
  }

  override visitCallExpression(n: CallExpression): Expression {
    if (
      isLoggerFuncExpression(n.callee) ||
      n.callee.type === 'MemberExpression' && isLoggerFuncExpression(n.callee.object)
    ) {
      // Matches expressions of form: 
      // log(...)
      // <obj>.log(...)
      // <obj>.log.<level>(...)

      if (n.arguments.length === 1) {
        n.arguments.push({
          expression: {
            type: 'ObjectExpression',
            properties: [],
            span: ZERO_SPAN,
          }
        })
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
                  span: ZERO_SPAN,
                },
                value: {
                  type: 'Identifier',
                  value: '__filename',
                  optional: false,
                  span: ZERO_SPAN,
                }
              },
              {
                type: 'KeyValueProperty',
                key: {
                  type: 'Identifier',
                  value: 'line',
                  optional: false,
                  span: ZERO_SPAN,
                },
                value: {
                  type: 'NumericLiteral',
                  value: 1,
                  span: ZERO_SPAN,
                }
              },
              {
                type: 'KeyValueProperty',
                key: {
                  type: 'Identifier',
                  value: 'ownershipScope',
                  optional: false,
                  span: ZERO_SPAN,
                },
                value: {
                  type: 'CallExpression',
                  callee: {
                    type: 'Identifier',
                    value: ID_GET_CURRENT_OWNERSHIP_SCOPE,
                    optional: false,
                    span: ZERO_SPAN,
                  },
                  arguments: [{
                    expression: {
                      type: "ThisExpression",
                      span: ZERO_SPAN,
                    }
                  }],
                  span: ZERO_SPAN,
                }
              },
              {
                type: 'KeyValueProperty',
                key: {
                  type: 'Identifier',
                  value: 'bugcheck',
                  optional: false,
                  span: ZERO_SPAN,
                },
                value: {
                  type: 'Identifier',
                  value: ID_BUGCHECK_STRING,
                  optional: false,
                  span: ZERO_SPAN,
                },
              },
            ],
            span: ZERO_SPAN,
          }
        })
      }
      return n
    } else {
      return super.visitCallExpression(n)
    }
  }
}

const isLoggerFuncExpression = (e: Expression | Super | Import) =>
  e.type === 'Identifier' && e.value === 'log'