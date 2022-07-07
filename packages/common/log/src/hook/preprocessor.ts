import { Argument, ArrowFunctionExpression, AssignmentExpression, BlockStatement, CallExpression, ClassMember, ClassMethod, ComputedPropName, Declaration, Expression, Fn, FunctionDeclaration, Identifier, Import, MemberExpression, Module, ParenthesisExpression, PrivateName, Program, ReturnStatement, SequenceExpression, Span, Statement, Super, transformSync, UpdateExpression } from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";

export function preprocess(code: string, filename: string) {
  return transformSync(code, {
    // sourceMaps: true,
    // sourceFileName: filename,
    plugin: (m) => new TraceInjector(filename).visitProgram(m),
    jsc: {
      target: 'es2022',
    },
  });
}

const ZERO_SPAN: Span = { ctxt: 0, end: 0, start: 0 };

class TraceInjector extends Visitor {
  programSpan!: Span
  constructor(
    private readonly filename: string,
  ) {
    super()
  }

  override visitCallExpression(n: CallExpression): Expression {
    if(
      n.callee.type === 'TaggedTemplateExpression' && (
        isLoggerFuncExpression(n.callee.tag) ||
        n.callee.tag.type === 'MemberExpression' && isLoggerFuncExpression(n.callee.tag.object)
      )
    ) {
      // Matches expressions of form: 
      // log`...`(...)
      // <obj>.log`...`(...)
      // <obj>.log.<level>`...`(...)

      if(n.arguments.length === 0) {
        n.arguments.push({
          expression: {
            type: 'ObjectExpression',
            properties: [],
            span: ZERO_SPAN,
          }
        })
      }
      if(n.arguments.length === 1) {
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
                    value: 'getCurrentOwnershipScope',
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
              }
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

const isLoggerFuncExpression = (e: Expression) => 
  e.type === 'Identifier' && e.value === 'log' ||
  e.type === 'MemberExpression' && e.property.type === 'Identifier' && e.property.value === 'log'