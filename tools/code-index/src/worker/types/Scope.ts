//
// Copyright 2026 DXOS.org
//

import { type Node, child, childList, isNode, nameOf, walk } from '../analyzers/ast.ts';
import { type ImportBinding } from './Boundary.ts';

/**
 * Lexical scopes of one file, value and type space apart, so the propagator binds an identifier
 * to the declaration TypeScript would — shadowing included. Built in one walk; lookups walk the
 * parent chain.
 */

/** One step from a binding pattern's root to the identifier it binds. */
export type PatternStep =
  | { readonly kind: 'property'; readonly name: string }
  | { readonly kind: 'element'; readonly index: number }
  | { readonly kind: 'default'; readonly node: Node }
  | { readonly kind: 'rest' };

export type ValueDeclaration =
  | {
      readonly kind: 'variable';
      readonly mode: string;
      readonly declarator: Node;
      readonly path: readonly PatternStep[];
    }
  | { readonly kind: 'param'; readonly fn: Node; readonly param: Node; readonly path: readonly PatternStep[] }
  | { readonly kind: 'function'; readonly node: Node }
  | { readonly kind: 'class'; readonly node: Node }
  | { readonly kind: 'import'; readonly binding: ImportBinding }
  /** Overloads, enums, namespaces, catch parameters, merged declarations: typed as unknown. */
  | { readonly kind: 'opaque' };

export type TypeDeclaration =
  | { readonly kind: 'alias'; readonly node: Node }
  | { readonly kind: 'interface'; readonly node: Node }
  | { readonly kind: 'class'; readonly node: Node }
  | { readonly kind: 'typeParam'; readonly node: Node }
  | { readonly kind: 'import'; readonly binding: ImportBinding }
  | { readonly kind: 'opaque' };

export type Declared<T> = { readonly declaration: T; readonly scope: Node };

type ScopeTable = {
  readonly values: Map<string, ValueDeclaration>;
  readonly types: Map<string, TypeDeclaration>;
};

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
]);

/** Nodes that own `var` declarations. */
const FUNCTION_SCOPES = new Set([...FUNCTION_NODES, 'Program', 'StaticBlock', 'TSModuleBlock']);

/** Nodes that own `let`/`const`/`class`/`function` declarations. */
const BLOCK_SCOPES = new Set([
  'Program',
  'BlockStatement',
  'StaticBlock',
  'TSModuleBlock',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
  'CatchClause',
]);

const TEST_OPERATORS = new Set(['===', '!==', '==', '!=', 'instanceof', 'in']);

const within = (node: Node, part: unknown): boolean => isNode(part) && part.start <= node.start && node.end <= part.end;

/** Whether an identifier sits where it could be narrowed: a condition, a guard, an assertion call, an assignment target. */
const isGuardPosition = (node: Node, ancestors: readonly Node[]): boolean => {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    switch (ancestor.type) {
      case 'IfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'ForStatement':
        return within(node, ancestor.test);
      case 'SwitchStatement':
        return within(node, ancestor.discriminant);
      case 'SwitchCase':
        return within(node, ancestor.test);
      case 'ConditionalExpression':
        if (within(node, ancestor.test)) {
          return true;
        }
        break;
      case 'LogicalExpression':
      case 'UpdateExpression':
        return true;
      case 'BinaryExpression':
        if (TEST_OPERATORS.has(String(ancestor.operator))) {
          return true;
        }
        break;
      case 'UnaryExpression':
        if (ancestor.operator === 'typeof') {
          return true;
        }
        break;
      case 'AssignmentExpression':
        if (within(node, ancestor.left)) {
          return true;
        }
        break;
      case 'ExpressionStatement': {
        // `assert(x)`: an assertion function narrows everything after it.
        const statement = child(ancestor, 'expression');
        const call = statement?.type === 'AwaitExpression' ? child(statement, 'argument') : statement;
        return call?.type === 'CallExpression' && childList(call, 'arguments').some((arg) => within(node, arg));
      }
      default:
        if (ancestor.type.endsWith('Statement') || ancestor.type.endsWith('Declaration') || isFunctionNode(ancestor)) {
          return false;
        }
    }
  }
  return false;
};

export type Scopes = {
  readonly parent: (node: Node) => Node | undefined;
  readonly program: Node;
  /** The value declaration an identifier reference binds to, and the scope that owns it. */
  readonly value: (name: string, at: Node) => Declared<ValueDeclaration> | undefined;
  readonly type: (name: string, at: Node) => Declared<TypeDeclaration> | undefined;
  /** Identifier references in a position where `tsc` could narrow them (see {@link isGuardPosition}). */
  readonly guarded: readonly Node[];
};

/** Identifiers bound by a pattern, with the path from the pattern root to each. */
export const patternBindings = (
  pattern: Node,
  path: readonly PatternStep[] = [],
): Array<{ name: string; node: Node; path: readonly PatternStep[] }> => {
  switch (pattern.type) {
    case 'Identifier': {
      const name = nameOf(pattern);
      return name ? [{ name, node: pattern, path }] : [];
    }
    case 'AssignmentPattern': {
      const left = child(pattern, 'left');
      const right = child(pattern, 'right');
      return left && right ? patternBindings(left, [...path, { kind: 'default', node: right }]) : [];
    }
    case 'RestElement': {
      const argument = child(pattern, 'argument');
      return argument ? patternBindings(argument, [...path, { kind: 'rest' }]) : [];
    }
    case 'ObjectPattern':
      return childList(pattern, 'properties').flatMap((property) => {
        if (property.type === 'RestElement') {
          return patternBindings(property, path);
        }
        const key = child(property, 'key');
        const value = child(property, 'value');
        const keyName =
          property.computed === true
            ? undefined
            : (nameOf(key) ?? (typeof key?.value === 'string' ? key.value : undefined));
        if (!value) {
          return [];
        }
        // A computed key binds names whose type no step can describe.
        return keyName === undefined
          ? patternBindings(value, [...path, { kind: 'rest' }])
          : patternBindings(value, [...path, { kind: 'property', name: keyName }]);
      });
    case 'ArrayPattern': {
      const elements = Array.isArray(pattern.elements) ? pattern.elements : [];
      return elements.flatMap((element, index) =>
        isNode(element) ? patternBindings(element, [...path, { kind: 'element', index }]) : [],
      );
    }
    default:
      return [];
  }
};

export const buildScopes = (program: Node, imports: ReadonlyMap<string, ImportBinding>): Scopes => {
  const parents = new Map<Node, Node>();
  const tables = new Map<Node, ScopeTable>();

  const tableOf = (scope: Node): ScopeTable => {
    let table = tables.get(scope);
    if (!table) {
      table = { values: new Map(), types: new Map() };
      tables.set(scope, table);
    }
    return table;
  };

  const nearest = (ancestors: readonly Node[], kinds: ReadonlySet<string>): Node => {
    for (let index = ancestors.length - 1; index >= 0; index--) {
      if (kinds.has(ancestors[index].type)) {
        return ancestors[index];
      }
    }
    return program;
  };

  // A name declared twice in one space (overloads, merging, redeclared `var`) has no single type.
  const declareValue = (scope: Node, name: string, declaration: ValueDeclaration) => {
    const values = tableOf(scope).values;
    const existing = values.get(name);
    if (
      existing &&
      !(existing.kind === 'function' && declaration.kind === 'function' && existing.node === declaration.node)
    ) {
      values.set(name, { kind: 'opaque' });
    } else {
      values.set(name, declaration);
    }
  };

  const declareType = (scope: Node, name: string, declaration: TypeDeclaration) => {
    const types = tableOf(scope).types;
    const existing = types.get(name);
    // Interfaces merge into one type that keeps its name; anything else merged is opaque.
    if (existing && !(existing.kind === 'interface' && declaration.kind === 'interface')) {
      types.set(name, { kind: 'opaque' });
    } else if (!existing) {
      types.set(name, declaration);
    }
  };

  for (const binding of imports.values()) {
    tableOf(program).values.set(binding.local, { kind: 'import', binding });
    tableOf(program).types.set(binding.local, { kind: 'import', binding });
  }

  const declareTypeParams = (owner: Node) => {
    const declaration = child(owner, 'typeParameters');
    for (const parameter of declaration ? childList(declaration, 'params') : []) {
      const name = nameOf(child(parameter, 'name'));
      if (name) {
        declareType(owner, name, { kind: 'typeParam', node: parameter });
      }
    }
  };

  const guarded: Node[] = [];

  walk(program, [], (node, ancestors) => {
    const parent = ancestors[ancestors.length - 1];
    if (parent) {
      parents.set(node, parent);
    }
    switch (node.type) {
      case 'Identifier':
        if (
          !(parent?.type === 'MemberExpression' && child(parent, 'property') === node && parent.computed !== true) &&
          isGuardPosition(node, ancestors)
        ) {
          guarded.push(node);
        }
        break;
      case 'VariableDeclaration': {
        const mode = typeof node.kind === 'string' ? node.kind : 'var';
        const scope =
          mode === 'var' ? nearest(ancestors, FUNCTION_SCOPES) : nearest([...ancestors, node], BLOCK_SCOPES);
        for (const declarator of childList(node, 'declarations')) {
          const id = child(declarator, 'id');
          for (const bound of id ? patternBindings(id) : []) {
            declareValue(scope, bound.name, { kind: 'variable', mode, declarator, path: bound.path });
          }
        }
        break;
      }
      case 'FunctionDeclaration':
      case 'TSDeclareFunction': {
        const name = nameOf(child(node, 'id'));
        const scope = nearest(ancestors, BLOCK_SCOPES);
        if (name) {
          const existing = tableOf(scope).values.get(name);
          // An overload signature and its implementation are one function with several signatures.
          if (existing || node.type === 'TSDeclareFunction') {
            tableOf(scope).values.set(name, { kind: 'opaque' });
          } else {
            declareValue(scope, name, { kind: 'function', node });
          }
        }
        declareFunction(node);
        break;
      }
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const name = nameOf(child(node, 'id'));
        if (name) {
          declareValue(node, name, { kind: 'function', node });
        }
        declareFunction(node);
        break;
      }
      case 'ClassDeclaration':
      case 'ClassExpression': {
        const name = nameOf(child(node, 'id'));
        if (name) {
          const scope = node.type === 'ClassDeclaration' ? nearest(ancestors, BLOCK_SCOPES) : node;
          declareValue(scope, name, { kind: 'class', node });
          declareType(scope, name, { kind: 'class', node });
        }
        declareTypeParams(node);
        break;
      }
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration': {
        const name = nameOf(child(node, 'id'));
        if (name) {
          declareType(
            nearest(ancestors, BLOCK_SCOPES),
            name,
            node.type === 'TSTypeAliasDeclaration' ? { kind: 'alias', node } : { kind: 'interface', node },
          );
        }
        declareTypeParams(node);
        break;
      }
      case 'TSEnumDeclaration':
      case 'TSModuleDeclaration': {
        const name = nameOf(child(node, 'id'));
        if (name) {
          const scope = nearest(ancestors, BLOCK_SCOPES);
          declareValue(scope, name, { kind: 'opaque' });
          declareType(scope, name, { kind: 'opaque' });
        }
        break;
      }
      case 'CatchClause': {
        const param = child(node, 'param');
        for (const bound of param ? patternBindings(param) : []) {
          declareValue(node, bound.name, { kind: 'opaque' });
        }
        break;
      }
      case 'TSMethodSignature':
      case 'TSFunctionType':
      case 'TSConstructorType':
      case 'TSCallSignatureDeclaration':
      case 'TSConstructSignatureDeclaration':
      case 'MethodDefinition':
        declareTypeParams(node);
        break;
      case 'TSMappedType':
      case 'TSInferType':
      case 'TSConditionalType': {
        // Names these introduce are type variables the propagator never evaluates.
        const parameter = child(node, 'typeParameter') ?? child(node, 'key');
        const name = nameOf(parameter && parameter.type === 'TSTypeParameter' ? child(parameter, 'name') : parameter);
        if (name) {
          declareType(node, name, { kind: 'opaque' });
        }
        break;
      }
    }
    return undefined;
  });

  function declareFunction(fn: Node) {
    declareTypeParams(fn);
    for (const param of childList(fn, 'params')) {
      const pattern = param.type === 'TSParameterProperty' ? child(param, 'parameter') : param;
      for (const bound of pattern ? patternBindings(pattern) : []) {
        declareValue(fn, bound.name, { kind: 'param', fn, param, path: bound.path });
      }
    }
  }

  const lookup = <T>(name: string, at: Node, space: (table: ScopeTable) => Map<string, T>): Declared<T> | undefined => {
    let current: Node | undefined = at;
    while (current) {
      const table = tables.get(current);
      const found = table ? space(table).get(name) : undefined;
      if (found) {
        return { declaration: found, scope: current };
      }
      current = parents.get(current);
    }
    return undefined;
  };

  return {
    parent: (node) => parents.get(node),
    program,
    value: (name, at) => lookup(name, at, (table) => table.values),
    type: (name, at) => lookup(name, at, (table) => table.types),
    guarded,
  };
};

export const isFunctionNode = (node: Node): boolean => FUNCTION_NODES.has(node.type);
