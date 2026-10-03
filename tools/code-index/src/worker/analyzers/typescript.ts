//
// Copyright 2026 DXOS.org
//

import { dirname, isAbsolute, relative, resolve as resolvePath } from 'node:path';
import { parseSync } from 'oxc-parser';

import { escapeFragment } from '../../internal/iri.ts';
import * as Ontology from '../../Ontology.ts';
import { type ImportBinding, importBindings } from '../types/Boundary.ts';
import { infer } from '../types/Infer.ts';
import * as TypeRdf from '../types/Rdf.ts';
import * as Term from '../types/Term.ts';
import { type Comment, type Node, type Statement, isNode, nameOf, walk } from './ast.ts';
import { type AnalyzeContext, fileNode } from './common.ts';

/**
 * TypeScript/JavaScript files: declarations, what constructs them, what they reference and from
 * which position, and a definition snippet — all structural. Nothing here names a framework; that
 * is the rule files' job (`design/ONTOLOGY.md`, "The parser asserts structure; rules assert
 * meaning").
 */

// ---------------------------------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------------------------------

type Resolution = { readonly file: string | undefined; readonly bare: boolean };

export const resolveSpecifier = (context: AnalyzeContext, specifier: string): Resolution => {
  const bare = !specifier.startsWith('.') && !isAbsolute(specifier);
  const resolved = context.resolve(context.path, specifier);
  const relativePath = resolved ? relative(context.root, resolved) : undefined;
  // A specifier that leaves the repository (or lands in node_modules) is a module reference, not a
  // file: the index only holds files it crawled.
  const inside = relativePath !== undefined && !relativePath.startsWith('..') && !relativePath.includes('node_modules');
  return { file: inside ? relativePath : undefined, bare };
};

/** IRIs a reference to `binding` (optionally through a member path) stands for — see ONTOLOGY "Member". */
const bindingTargets = (binding: ImportBinding, path: readonly string[]): string[] => {
  const targets: string[] = [];
  const memberPath = binding.imported === '*' ? path.join('.') : [binding.imported, ...path].join('.');
  if (binding.bare && memberPath.length > 0) {
    targets.push(Ontology.memberIri(binding.specifier, memberPath).value);
  }
  if (binding.file) {
    const name = binding.imported === '*' ? path[0] : binding.imported;
    if (name) {
      targets.push(Ontology.symbolIri(binding.file, name).value);
    } else {
      targets.push(Ontology.fileIri(binding.file).value);
    }
  }
  if (targets.length === 0 && binding.bare) {
    targets.push(Ontology.memberIri(binding.specifier, binding.imported === '*' ? '' : binding.imported).value);
  }
  return targets;
};

// ---------------------------------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------------------------------

type Declaration = {
  readonly name: string;
  readonly kind: string;
  readonly exported: boolean;
  /** The declaring node (class, function, declarator, …), for construction analysis. */
  readonly node: Node;
  /** The top-level statement, including any `export` wrapper — the snippet span. */
  readonly statement: Node;
  readonly offset: number;
};

const isPrivateMember = (node: Node): boolean =>
  (node.type === 'PropertyDefinition' || node.type === 'MethodDefinition' || node.type === 'AccessorProperty') &&
  ((isNode(node.key) && node.key.type === 'PrivateIdentifier') || node.accessibility === 'private');

const KINDS: Record<string, string> = {
  FunctionDeclaration: 'function',
  ClassDeclaration: 'class',
  TSTypeAliasDeclaration: 'type',
  TSInterfaceDeclaration: 'interface',
  TSEnumDeclaration: 'enum',
  TSModuleDeclaration: 'namespace',
};

const declarationsOf = (node: Node, statement: Node, exported: boolean): Declaration[] => {
  if (node.type === 'VariableDeclaration' && Array.isArray(node.declarations)) {
    return node.declarations.filter(isNode).flatMap((declarator) => {
      const id = isNode(declarator.id) ? declarator.id : undefined;
      return id?.type === 'Identifier' && typeof id.name === 'string'
        ? [{ name: id.name, kind: 'variable', exported, node: declarator, statement, offset: id.start }]
        : [];
    });
  }
  const kind = KINDS[node.type];
  if (!kind) {
    return [];
  }
  // A default-exported function or class may be anonymous, and a TS module declaration's id may be
  // a string literal; the caller names those.
  const id = isNode(node.id) ? node.id : undefined;
  return id?.type === 'Identifier' && typeof id.name === 'string'
    ? [{ name: id.name, kind, exported, node, statement, offset: id.start }]
    : [];
};

const keyNameOf = (node: Node): string | undefined => {
  const key = isNode(node.key) ? node.key : undefined;
  if (!key || node.computed === true) {
    return undefined;
  }
  return nameOf(key) ?? (typeof key.value === 'string' ? key.value : undefined);
};

/** The kind a static class member is indexed under, or `undefined` when it is not one. */
const staticKindOf = (member: Node): string | undefined => {
  if (member.static !== true || isPrivateMember(member)) {
    return undefined;
  }
  if (member.type === 'PropertyDefinition') {
    return isNode(member.value) ? 'variable' : undefined;
  }
  // An overload signature has no body; only the implementation is declared, as with top-level functions.
  return member.type === 'MethodDefinition' &&
    member.kind === 'method' &&
    isNode(member.value) &&
    isNode(member.value.body)
    ? 'function'
    : undefined;
};

/**
 * Initialized static properties and static methods: the companion-object pattern
 * (`static layerEmpty = Layer.succeed(…)`, `static layer() { … }`) declares module-level values under
 * a class, and they are as much API as a top-level `const` or function.
 */
const staticMembers = (node: Node, className: string, exported: boolean): Declaration[] => {
  const body = isNode(node.body) && Array.isArray(node.body.body) ? node.body.body.filter(isNode) : [];
  return body.flatMap((member) => {
    const kind = staticKindOf(member);
    const key = kind ? keyNameOf(member) : undefined;
    return kind && key
      ? [
          {
            name: `${className}.${key}`,
            kind,
            exported,
            node: member,
            statement: member,
            offset: member.start,
          },
        ]
      : [];
  });
};

/**
 * Top-level declarations, with whether each one leaves the module. Recurses into namespace bodies —
 * `export namespace X { export const Y = … }` declares `X.Y`, which is module API under another name.
 */
export const declarations = (body: readonly Statement[], prefix = '', inherited = false): Declaration[] =>
  (body as readonly unknown[]).flatMap((raw) => {
    // oxc's AST types are a union of interfaces; the walker addresses nodes structurally.
    if (!isNode(raw)) {
      return [];
    }
    const statement: Node = raw;
    const qualify = (declared: readonly Declaration[]): Declaration[] =>
      declared.flatMap((declaration) => {
        const named = {
          ...declaration,
          name: `${prefix}${declaration.name}`,
          exported: prefix === '' ? declaration.exported : declaration.exported && inherited,
        };
        const isClass = declaration.node.type === 'ClassDeclaration';
        // A namespace body declares its own members; a class declares its initialized statics.
        const nested =
          declaration.node.type === 'TSModuleDeclaration' && isNode(declaration.node.body)
            ? declarations(
                (Array.isArray(declaration.node.body.body) ? declaration.node.body.body : []) as readonly Statement[],
                `${named.name}.`,
                named.exported,
              )
            : isClass
              ? staticMembers(declaration.node, named.name, named.exported)
              : [];
        return [named, ...nested];
      });
    switch (statement.type) {
      case 'ExportNamedDeclaration':
        return isNode(statement.declaration) ? qualify(declarationsOf(statement.declaration, statement, true)) : [];
      case 'ExportDefaultDeclaration': {
        const declaration = isNode(statement.declaration) ? statement.declaration : undefined;
        const named = declaration ? qualify(declarationsOf(declaration, statement, true)) : [];
        return named.length > 0
          ? named
          : [
              {
                name: 'default',
                kind: declaration ? (KINDS[declaration.type] ?? 'variable') : 'variable',
                exported: true,
                node: declaration ?? statement,
                statement,
                offset: statement.start,
              },
            ];
      }
      default:
        return qualify(declarationsOf(statement, statement, false));
    }
  });

// ---------------------------------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------------------------------

// TS nodes that are expressions or declarations of values, not type contexts. A reference whose
// nearest TS ancestor is one of these — or has no TS ancestor — sits in a value position.
const VALUE_TS_NODES = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'TSTypeAssertion',
  'TSEnumDeclaration',
  'TSEnumBody',
  'TSEnumMember',
  'TSModuleDeclaration',
  'TSModuleBlock',
  'TSExportAssignment',
  'TSParameterProperty',
]);

const inTypePosition = (ancestors: readonly Node[], node: Node): boolean => {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    if (ancestor.type.startsWith('TS')) {
      return !VALUE_TS_NODES.has(ancestor.type);
    }
    // A class's heritage clause is part of its signature.
    if (ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression') {
      const superClass = isNode(ancestor.superClass) ? ancestor.superClass : undefined;
      return superClass !== undefined && node.start >= superClass.start && node.end <= superClass.end;
    }
  }
  return false;
};

// Identifiers that name things rather than refer to them.
const isBindingPosition = (node: Node, parent: Node | undefined): boolean => {
  if (!parent) {
    return false;
  }
  switch (parent.type) {
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ExportSpecifier':
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return true;
    case 'MemberExpression':
    case 'JSXMemberExpression':
      return parent.property === node && parent.computed !== true;
    case 'Property':
      return parent.key === node && parent.computed !== true && parent.shorthand !== true;
    case 'PropertyDefinition':
    case 'MethodDefinition':
    case 'TSPropertySignature':
    case 'TSMethodSignature':
    case 'AccessorProperty':
      return parent.key === node && parent.computed !== true;
    case 'VariableDeclarator':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
    case 'TSTypeAliasDeclaration':
    case 'TSInterfaceDeclaration':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration':
    case 'TSTypeParameter':
      return parent.id === node || parent.name === node;
    case 'TSQualifiedName':
      return parent.right === node;
    case 'JSXAttribute':
      return parent.name === node;
    default:
      return false;
  }
};

const isParameterBinding = (node: Node, parent: Node | undefined): boolean =>
  parent !== undefined &&
  (parent.type === 'FunctionDeclaration' ||
    parent.type === 'FunctionExpression' ||
    parent.type === 'ArrowFunctionExpression') &&
  Array.isArray(parent.params) &&
  parent.params.includes(node);

/** Statements whose identifiers name modules, which the import pass already accounts for. */
const MODULE_STATEMENTS = new Set(['ImportDeclaration', 'ExportAllDeclaration']);

const ES_GLOBALS = new Set([
  'undefined',
  'globalThis',
  'console',
  'process',
  'Buffer',
  'window',
  'document',
  'navigator',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'Math',
  'JSON',
  'Date',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'AggregateError',
  'Promise',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'WeakRef',
  'Proxy',
  'Reflect',
  'Intl',
  'Atomics',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'Uint8ClampedArray',
  'TextEncoder',
  'TextDecoder',
  'URL',
  'URLSearchParams',
  'AbortController',
  'AbortSignal',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'queueMicrotask',
  'structuredClone',
  'fetch',
  'Request',
  'Response',
  'Headers',
  'Blob',
  'File',
  'FormData',
  'crypto',
  'performance',
  'Event',
  'EventTarget',
  'CustomEvent',
  'Worker',
  'MessageChannel',
  'MessagePort',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'NaN',
  'Infinity',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'encodeURIComponent',
  'decodeURI',
  'decodeURIComponent',
  'Iterator',
  'AsyncIterator',
  'Generator',
  'Function',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'ReturnType',
  'Parameters',
  'InstanceType',
  'Awaited',
  'ConstructorParameters',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
  'PromiseLike',
  'ArrayLike',
  'Iterable',
  'AsyncIterable',
  'IterableIterator',
  'PropertyKey',
  'ThisParameterType',
  'OmitThisParameter',
  'NoInfer',
  'Disposable',
  'AsyncDisposable',
  'HTMLElement',
  'Element',
  'Node',
  'Bun',
  'ImportMeta',
]);

/** The root identifier of a member/qualified chain, and the property names hung off it. */
const chainOf = (node: Node, ancestors: readonly Node[]): { root: Node; path: string[] } | undefined => {
  let root = node;
  let index = ancestors.length - 1;
  const path: string[] = [];
  while (index >= 0) {
    const parent = ancestors[index];
    if (
      (parent.type === 'MemberExpression' || parent.type === 'JSXMemberExpression') &&
      parent.object === root &&
      parent.computed !== true
    ) {
      const property = nameOf(isNode(parent.property) ? parent.property : undefined);
      if (property === undefined) {
        break;
      }
      path.push(property);
    } else if (parent.type === 'TSQualifiedName' && parent.left === root) {
      const property = nameOf(isNode(parent.right) ? parent.right : undefined);
      if (property === undefined) {
        break;
      }
      path.push(property);
    } else {
      break;
    }
    root = parent;
    index--;
  }
  return { root: node, path };
};

type Reference = {
  readonly name: string;
  readonly path: readonly string[];
  readonly type: boolean;
};

// ---------------------------------------------------------------------------------------------------
// Construction: what a declaration extends, what call builds it, through what it is piped
// ---------------------------------------------------------------------------------------------------

type ExpressionRef = { readonly name: string; readonly path: readonly string[] };

/** `a.b.c` → root `a`, path `b.c`; an identifier alone is its own root. */
const expressionRef = (node: Node): ExpressionRef | undefined => {
  if (node.type === 'Identifier' && typeof node.name === 'string') {
    return { name: node.name, path: [] };
  }
  if (node.type === 'MemberExpression' && node.computed !== true && isNode(node.object) && isNode(node.property)) {
    const object = expressionRef(node.object);
    const property = nameOf(node.property);
    return object && property ? { name: object.name, path: [...object.path, property] } : undefined;
  }
  return undefined;
};

/** Strip wrappers that do not change what a call *is*: nested calls, `!`, `as`, parentheses, `new`. */
const headCallee = (node: Node): { callee: Node; call: Node | undefined } => {
  let current = node;
  let call: Node | undefined;
  for (;;) {
    if ((current.type === 'CallExpression' || current.type === 'NewExpression') && isNode(current.callee)) {
      call ??= current;
      current = current.callee;
    } else if (
      (current.type === 'TSNonNullExpression' ||
        current.type === 'TSAsExpression' ||
        current.type === 'TSSatisfiesExpression' ||
        current.type === 'TSInstantiationExpression' ||
        current.type === 'ParenthesizedExpression' ||
        current.type === 'ChainExpression') &&
      isNode(current.expression)
    ) {
      current = current.expression;
    } else {
      return { callee: current, call };
    }
  }
};

const isPipeCall = (node: Node): boolean =>
  node.type === 'CallExpression' &&
  isNode(node.callee) &&
  node.callee.type === 'MemberExpression' &&
  node.callee.computed !== true &&
  isNode(node.callee.property) &&
  nameOf(node.callee.property) === 'pipe';

type Construction = {
  readonly constructedBy: ExpressionRef[];
  readonly pipedThrough: ExpressionRef[];
  readonly derivedFrom: ExpressionRef[];
  readonly argument: ExpressionRef[];
};

const constructionOf = (initializer: Node): Construction => {
  const pipedThrough: ExpressionRef[] = [];
  let base = initializer;
  // Unwind `x.pipe(a(...), b)` chains: each stage's head callee is `pipedThrough`, the base is what
  // was constructed or referenced.
  while (isPipeCall(base) && isNode(base.callee) && isNode(base.callee.object)) {
    const stages = Array.isArray(base.arguments) ? base.arguments.filter(isNode) : [];
    // Stages of one call keep source order; an outer `.pipe(...)` applies after an inner one, so
    // each chained call's group goes in front of what has already been collected.
    const group = stages.flatMap((stage) => {
      const ref = expressionRef(headCallee(stage).callee);
      return ref ? [ref] : [];
    });
    pipedThrough.unshift(...group);
    base = base.callee.object;
  }
  const { callee, call } = headCallee(base);
  const ref = expressionRef(callee);
  if (!ref) {
    return { constructedBy: [], pipedThrough, derivedFrom: [], argument: [] };
  }
  if (!call) {
    return { constructedBy: [], pipedThrough, derivedFrom: [ref], argument: [] };
  }
  // The first argument of the innermost call: `Layer.effect(Store, make(dir))` → `Store`; for a
  // curried `Context.Service<…>()('id')` the innermost call is the one with no arguments.
  const first = Array.isArray(call.arguments) ? call.arguments.filter(isNode)[0] : undefined;
  const argument = first ? expressionRef(headCallee(first).callee) : undefined;
  return {
    constructedBy: [ref],
    pipedThrough,
    derivedFrom: [],
    argument: argument && argument.name !== ref.name ? [argument] : [],
  };
};

/** An expression without the wrappers that do not change its value (`as const`, `!`, parentheses). */
const unwrapped = (node: Node): Node => {
  const { callee, call } = headCallee(node);
  return call ? node : callee;
};

/** One reference passed into a call: `f(a, { k: [b] })` → `(f, "0", a)`, `(f, "1.k", b)`. */
type PassedRef = { readonly callee: ExpressionRef; readonly slot: string; readonly ref: ExpressionRef };

/** A reference written as an argument, through the wrappers that do not change what it denotes. */
const passedRef = (node: Node): ExpressionRef | undefined => {
  const { callee, call } = headCallee(node);
  return call ? undefined : expressionRef(callee);
};

/**
 * Every reference a call inside `node` receives at a shallow slot: a positional argument, an element
 * of an array argument, or a property (or property's array element) of an object-literal argument.
 * Deeper literals are not followed, which bounds the facts to what an argument list spells out.
 */
const passedRefsOf = (node: Node): PassedRef[] => {
  const found: PassedRef[] = [];
  /** `const spec = { provides: [X] } as const; make(name, spec)` reads as `make(name, { provides: [X] })`. */
  const literals = new Map<string, Node>();
  walk(node, [], (current) => {
    if (current.type === 'VariableDeclarator' && isNode(current.id) && isNode(current.init)) {
      const name = nameOf(current.id);
      const init = unwrapped(current.init);
      if (name && (init.type === 'ObjectExpression' || init.type === 'ArrayExpression')) {
        literals.set(name, init);
      }
    }
    return undefined;
  });
  const literalOf = (value: Node): Node => {
    const bare = unwrapped(value);
    const name = bare.type === 'Identifier' ? nameOf(bare) : undefined;
    return (name && literals.get(name)) || bare;
  };
  const add = (callee: ExpressionRef, slot: string, value: Node) => {
    const ref = passedRef(value);
    if (ref) {
      found.push({ callee, slot, ref });
    }
  };
  const addAll = (callee: ExpressionRef, slot: string, value: Node) => {
    const literal = literalOf(value);
    if (literal.type === 'ArrayExpression' && Array.isArray(literal.elements)) {
      for (const element of literal.elements.filter(isNode)) {
        // `[...xs]` passes what `xs` holds, so the spread list is the reference at that slot.
        add(callee, slot, element.type === 'SpreadElement' && isNode(element.argument) ? element.argument : element);
      }
    } else {
      add(callee, slot, value);
    }
  };
  walk(node, [], (current) => {
    if (current.type !== 'CallExpression' && current.type !== 'NewExpression') {
      return undefined;
    }
    const callee = isNode(current.callee) ? expressionRef(headCallee(current.callee).callee) : undefined;
    if (!callee || !Array.isArray(current.arguments)) {
      return undefined;
    }
    current.arguments.filter(isNode).forEach((argument, index) => {
      const value = literalOf(argument);
      if (value.type === 'ObjectExpression' && Array.isArray(value.properties)) {
        for (const property of value.properties.filter(isNode)) {
          const key =
            property.type === 'Property' && property.computed !== true && isNode(property.key)
              ? (nameOf(property.key) ?? (typeof property.key.value === 'string' ? property.key.value : undefined))
              : undefined;
          if (key !== undefined && isNode(property.value)) {
            addAll(callee, `${index}.${key}`, property.value);
          }
        }
      } else {
        addAll(callee, String(index), argument);
      }
    });
    return undefined;
  });
  return found;
};

/** One string literal passed positionally into a call: `DXN.make('a', '0.1.0')` → `(DXN.make, "1", "0.1.0")`. */
type PassedLiteral = {
  readonly callee: ExpressionRef;
  readonly slot: string;
  readonly value: string;
  readonly start: number;
};

/** Longer strings are prose (messages, templates), not identifiers a rule would join on. */
const LITERAL_MAX = 256;

/** How many object-literal keys a literal argument is followed through: `"0.plugin.key"` is two. */
const LITERAL_KEY_DEPTH = 2;

const FUNCTION_NODES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration']);

const stringLiteralOf = (node: Node): string | undefined => {
  if ((node.type === 'Literal' || node.type === 'StringLiteral') && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && Array.isArray(node.expressions) && node.expressions.length === 0) {
    const [quasi] = Array.isArray(node.quasis) ? node.quasis.filter(isNode) : [];
    const value = quasi && typeof quasi.value === 'object' && quasi.value !== null ? quasi.value : {};
    return 'cooked' in value && typeof value.cooked === 'string' ? value.cooked : undefined;
  }
  return undefined;
};

/**
 * String literals passed into calls of a declaration's definition, as arguments or under an
 * object-literal argument's keys — never inside a function body, where literals are messages rather
 * than the identity (`DXN.make`, a service key) a declaration is built from.
 */
const passedLiteralsOf = (node: Node): PassedLiteral[] => {
  const found: PassedLiteral[] = [];
  walk(node, [], (current) => {
    if (FUNCTION_NODES.has(current.type)) {
      return false;
    }
    if (current.type !== 'CallExpression' && current.type !== 'NewExpression') {
      return undefined;
    }
    const callee = isNode(current.callee) ? expressionRef(headCallee(current.callee).callee) : undefined;
    if (!callee || !Array.isArray(current.arguments)) {
      return undefined;
    }
    // Object-literal arguments are followed a bounded number of keys deep, because identity often
    // sits there: `Config2.make({ plugin: { key: 'org.dxos.plugin.chess' } })` → slot `"0.plugin.key"`.
    const visit = (argument: Node, slot: string, depth: number) => {
      const value = stringLiteralOf(argument);
      if (value !== undefined) {
        if (value.length <= LITERAL_MAX) {
          found.push({ callee, slot, value, start: argument.start });
        }
      } else if (
        depth < LITERAL_KEY_DEPTH &&
        argument.type === 'ObjectExpression' &&
        Array.isArray(argument.properties)
      ) {
        for (const property of argument.properties.filter(isNode)) {
          const key =
            property.type === 'Property' && property.computed !== true && isNode(property.key)
              ? (nameOf(property.key) ?? (typeof property.key.value === 'string' ? property.key.value : undefined))
              : undefined;
          if (key !== undefined && /^[\w$-]+$/.test(key) && isNode(property.value)) {
            visit(property.value, `${slot}.${key}`, depth + 1);
          }
        }
      }
    };
    current.arguments.filter(isNode).forEach((argument, index) => visit(argument, String(index), 0));
    return undefined;
  });
  return found;
};

// ---------------------------------------------------------------------------------------------------
// Call sites
// ---------------------------------------------------------------------------------------------------

/** Object-literal keys followed into an argument: `plugin.icon.key` is three. */
const CALL_PATH_DEPTH = 3;
const CALL_LITERALS_MAX = 32;
const CALL_ARRAY_MAX = 16;
const CALL_POSITIONS = 8;
/** Past this a file is generated rather than written; later calls are not counted, so IRIs stay stable. */
const CALL_SITES_MAX = 2000;

/** Nodes that do not change what an expression is, looked through between a call and its argument. */
const EXPRESSION_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'TSTypeAssertion',
  'ParenthesizedExpression',
  'ChainExpression',
]);

const PROPERTY_KEY = /^[A-Za-z_$][\w$-]*$/;

/** A plain property's key, when a rule could name it in a `key=value` literal. */
const propertyKeyOf = (property: Node): string | undefined => {
  if (property.type !== 'Property' || property.computed === true || !isNode(property.key)) {
    return undefined;
  }
  const key = nameOf(property.key) ?? (typeof property.key.value === 'string' ? property.key.value : undefined);
  return key !== undefined && PROPERTY_KEY.test(key) ? key : undefined;
};

/** `f(a)(b)` → head `f` and its calls, innermost first. */
const curriedOf = (call: Node): { callee: Node; calls: Node[] } => {
  const calls: Node[] = [];
  let current = call;
  for (;;) {
    if ((current.type === 'CallExpression' || current.type === 'NewExpression') && isNode(current.callee)) {
      calls.unshift(current);
      current = current.callee;
    } else if (EXPRESSION_WRAPPERS.has(current.type) && isNode(current.expression)) {
      current = current.expression;
    } else {
      return { callee: current, calls };
    }
  }
};

const argumentsOf = (call: Node): Node[] => (Array.isArray(call.arguments) ? call.arguments.filter(isNode) : []);

/** 1-based line of an offset, by binary search over the line starts. */
const lineIndex = (source: string): ((offset: number) => number) => {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (starts[middle] <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low + 1;
  };
};

type Landing = { readonly targets: readonly string[]; readonly rest: readonly string[] };

type CallSiteInput = {
  readonly program: Node;
  readonly path: string;
  readonly source: string;
  readonly declared: readonly Declaration[];
  /** Where a callee lands from inside the named declaration (or at file level). */
  readonly land: (ref: ExpressionRef, enclosing: string | undefined) => Landing;
};

type CallDraft = {
  readonly iri: string;
  readonly landing: Landing;
  readonly enclosedBy: string;
  readonly line: number;
  /** Where each call of a curried chain starts numbering its arguments. */
  readonly offsets: Map<Node, number>;
  readonly literals: string[];
  readonly parent: { readonly draft: CallDraft; readonly key: string } | undefined;
  hasConfig: boolean;
  keep: boolean;
};

/**
 * Every call whose head callee resolves, with the scalar literals its arguments spell out, its
 * enclosing declaration and the call it is an argument of — framework-agnostic: rules give a callee
 * meaning. Only calls that carry a literal or a configuration object, and the calls those are
 * arguments of, are emitted.
 */
const callSitesOf = ({ program, path, source, declared, land: resolve }: CallSiteInput): Ontology.CallSiteNode[] => {
  // Calls repeat their callee (`expect`, `Effect.gen`); resolving one builds escaped IRIs.
  const landings = new Map<string, Landing>();
  const land = (ref: ExpressionRef, within: string | undefined): Landing => {
    const key = `${within ?? ''}\0${ref.name}.${ref.path.join('.')}`;
    let landing = landings.get(key);
    if (!landing) {
      landing = resolve(ref, within);
      landings.set(key, landing);
    }
    return landing;
  };
  const lineOfOffset = lineIndex(source);
  const fileIri = Ontology.fileIri(path).value;
  const enclosing = new Map(
    declared.map((declaration) => [
      declaration.node,
      { name: declaration.name, iri: Ontology.symbolIri(path, declaration.name).value },
    ]),
  );
  const constants = new Map<string, string>();
  for (const declaration of declared) {
    const variable =
      declaration.statement.type === 'ExportNamedDeclaration' && isNode(declaration.statement.declaration)
        ? declaration.statement.declaration
        : declaration.statement;
    if (
      variable.type === 'VariableDeclaration' &&
      variable.kind === 'const' &&
      declaration.node.type === 'VariableDeclarator' &&
      isNode(declaration.node.init)
    ) {
      const value = stringLiteralOf(unwrapped(declaration.node.init));
      if (value !== undefined) {
        constants.set(declaration.name, value);
      }
    }
  }

  /** A scalar as text: a string, number or boolean literal, a same-file string const, or `f('x')` with resolvable `f`. */
  const scalarOf = (node: Node, enclosing: string | undefined): string | undefined => {
    const bare = unwrapped(node);
    const text = stringLiteralOf(bare);
    if (text !== undefined) {
      return text;
    }
    if (bare.type === 'Literal' && (typeof bare.value === 'number' || typeof bare.value === 'boolean')) {
      return String(bare.value);
    }
    if (
      bare.type === 'UnaryExpression' &&
      bare.operator === '-' &&
      isNode(bare.argument) &&
      bare.argument.type === 'Literal' &&
      typeof bare.argument.value === 'number'
    ) {
      return `-${bare.argument.value}`;
    }
    const name = bare.type === 'Identifier' ? nameOf(bare) : undefined;
    if (name !== undefined) {
      return constants.get(name);
    }
    if (bare.type === 'CallExpression' && isNode(bare.callee)) {
      const [only, ...more] = argumentsOf(bare);
      const inner = only && more.length === 0 ? stringLiteralOf(unwrapped(only)) : undefined;
      const ref = expressionRef(headCallee(bare.callee).callee);
      if (inner !== undefined && ref && land(ref, enclosing).targets.length > 0) {
        return inner;
      }
    }
    return undefined;
  };

  const collect = (draft: CallDraft, enclosing: string | undefined, argument: Node, index: number) => {
    const push = (key: string, value: string) => {
      const fact = `${key}=${value}`;
      if (
        value.length <= LITERAL_MAX &&
        !value.includes('\n') &&
        draft.literals.length < CALL_LITERALS_MAX &&
        !draft.literals.includes(fact)
      ) {
        draft.literals.push(fact);
      }
    };
    const scalars = (array: Node): string[] =>
      (Array.isArray(array.elements) ? array.elements.filter(isNode) : [])
        .slice(0, CALL_ARRAY_MAX)
        .flatMap((element) => scalarOf(element, enclosing) ?? []);
    const object = (node: Node, prefix: string, depth: number) => {
      for (const property of Array.isArray(node.properties) ? node.properties.filter(isNode) : []) {
        const key = propertyKeyOf(property);
        if (key === undefined || !isNode(property.value)) {
          continue;
        }
        const value = scalarOf(property.value, enclosing);
        if (value !== undefined) {
          push(`${prefix}${key}`, value);
          continue;
        }
        const bare = unwrapped(property.value);
        if (bare.type === 'ObjectExpression' && depth < CALL_PATH_DEPTH) {
          object(bare, `${prefix}${key}.`, depth + 1);
        } else if (bare.type === 'ArrayExpression') {
          scalars(bare).forEach((element) => push(`${prefix}${key}`, element));
        }
      }
    };
    if (index >= CALL_POSITIONS) {
      return;
    }
    const value = scalarOf(argument, enclosing);
    if (value !== undefined) {
      push(String(index), value);
      return;
    }
    const bare = unwrapped(argument);
    if (bare.type === 'ObjectExpression') {
      draft.hasConfig ||= Array.isArray(bare.properties) && bare.properties.length > 0;
      object(bare, '', 1);
    } else if (bare.type === 'ArrayExpression') {
      scalars(bare).forEach((element) => push(String(index), element));
    }
  };

  /** The call `node` is an argument of, through literals and wrappers only — never a function or member access. */
  const parentOf = (node: Node, ancestors: readonly Node[], drafts: ReadonlyMap<Node, CallDraft>) => {
    const keys: string[] = [];
    let child = node;
    for (let index = ancestors.length - 1; index >= 0; index--) {
      const parent = ancestors[index];
      if (
        EXPRESSION_WRAPPERS.has(parent.type) ||
        parent.type === 'ArrayExpression' ||
        parent.type === 'ObjectExpression' ||
        parent.type === 'SpreadElement'
      ) {
        child = parent;
        continue;
      }
      if (parent.type === 'Property' && parent.value === child) {
        const key = propertyKeyOf(parent);
        if (key === undefined) {
          return undefined;
        }
        keys.unshift(key);
        child = parent;
        continue;
      }
      if (parent.type === 'CallExpression' || parent.type === 'NewExpression') {
        const draft = drafts.get(parent);
        const position = argumentsOf(parent).indexOf(child);
        // An unresolvable call, or `node` is its callee rather than an argument.
        if (!draft || position < 0) {
          return undefined;
        }
        return {
          draft,
          key: keys.length > 0 ? keys.join('.') : String((draft.offsets.get(parent) ?? 0) + position),
        };
      }
      return undefined;
    }
    return undefined;
  };

  const drafts = new Map<Node, CallDraft>();
  const ordered: CallDraft[] = [];
  const ordinals = new Map<string, number>();
  walk(program, [], (node, ancestors) => {
    if ((node.type !== 'CallExpression' && node.type !== 'NewExpression') || drafts.has(node)) {
      return undefined;
    }
    if (ordered.length >= CALL_SITES_MAX) {
      return false;
    }
    const { callee, calls } = curriedOf(node);
    const ref = expressionRef(callee);
    // `x.pipe(…)` applies its arguments; the stages are the calls worth recording.
    if (!ref || ref.path.at(-1) === 'pipe') {
      return undefined;
    }
    // The innermost declaration node on the path from the root is the enclosing declaration.
    let span = enclosing.get(node);
    for (let index = ancestors.length - 1; index >= 0 && !span; index--) {
      span = enclosing.get(ancestors[index]);
    }
    const landing = land(ref, span?.name);
    if (landing.targets.length === 0) {
      return undefined;
    }
    const enclosedBy = span?.iri ?? fileIri;
    const text = [ref.name, ...ref.path].join('.');
    const counter = `${enclosedBy} ${text}`;
    const ordinal = ordinals.get(counter) ?? 0;
    ordinals.set(counter, ordinal + 1);
    // Pre-order: the call this one is an argument of was visited, and drafted, first.
    const parent = parentOf(node, ancestors, drafts);
    const draft: CallDraft = {
      iri: Ontology.callSiteIri(enclosedBy, text, ordinal).value,
      landing,
      enclosedBy,
      line: lineOfOffset(node.start),
      offsets: new Map(),
      literals: [],
      parent,
      hasConfig: false,
      keep: false,
    };
    let offset = 0;
    for (const call of calls) {
      drafts.set(call, draft);
      draft.offsets.set(call, offset);
      const callArguments = argumentsOf(call);
      callArguments.forEach((argument, index) => collect(draft, span?.name, argument, offset + index));
      offset += callArguments.length;
    }
    ordered.push(draft);
    return undefined;
  });

  for (const draft of ordered) {
    if (draft.literals.length > 0 || draft.hasConfig) {
      for (let current: CallDraft | undefined = draft; current && !current.keep; current = current.parent?.draft) {
        current.keep = true;
      }
    }
  }
  return ordered
    .filter((draft) => draft.keep)
    .map((draft) => ({
      '@id': draft.iri,
      '@type': 'CallSite' as const,
      'callee': [...draft.landing.targets],
      ...(draft.landing.rest.length > 0 ? { calleePath: draft.landing.rest.join('.') } : {}),
      'enclosedBy': draft.enclosedBy,
      'line': draft.line,
      ...(draft.parent ? { argOf: draft.parent.draft.iri, argKey: draft.parent.key } : {}),
      ...(draft.literals.length > 0 ? { literal: draft.literals } : {}),
    }));
};

// ---------------------------------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------------------------------

export const SNIPPET_BUDGET = 1200;

/**
 * Past this a declaration has no snippet at all. Collapsing only shrinks literal and function
 * bodies, so a declaration made of neither (a giant string, a long JSX tree, a generated table)
 * cannot be reduced — and a term the size of a source file is refused by the quad store anyway.
 */
export const SNIPPET_HARD_CAP = SNIPPET_BUDGET * 8;

const LITERAL_DEPTH = 3;

type Cut = { readonly start: number; readonly end: number; readonly text: string };

const LITERAL_NODES = new Set(['ObjectExpression', 'ArrayExpression', 'TSTypeLiteral']);

const isFunctionNode = (node: Node): boolean =>
  node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';

/** Apply non-overlapping cuts (outer wins) to a span of the source. */
const splice = (source: string, start: number, end: number, cuts: readonly Cut[]): string => {
  const sorted = [...cuts].filter((cut) => cut.start >= start && cut.end <= end).sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = start;
  for (const cut of sorted) {
    if (cut.start < cursor) {
      continue;
    }
    out += source.slice(cursor, cut.start) + cut.text;
    cursor = cut.end;
  }
  out += source.slice(cursor, end);
  return out
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n')
    .trim();
};

/**
 * The declaration with its implementation abbreviated: function bodies always collapse, private
 * members go, literals deeper than {@link LITERAL_DEPTH} collapse, and an annotated variable loses
 * its initializer behind `declare`. Generous by design — see ONTOLOGY "Snippets".
 */
export const snippetOf = (
  source: string,
  declaration: Declaration,
  comments: readonly Comment[],
): string | undefined => {
  const { statement } = declaration;
  const cuts: Cut[] = [];
  const literals: Array<{ node: Node; depth: number }> = [];

  for (const comment of comments) {
    if (comment.start >= statement.start && comment.end <= statement.end) {
      cuts.push({ start: comment.start, end: comment.end, text: '' });
    }
  }

  walk(statement, [], (node, ancestors) => {
    if (isFunctionNode(node) && isNode(node.body)) {
      const body = node.body;
      cuts.push({ start: body.start, end: body.end, text: '{ /*...*/ }' });
      return false;
    }
    if (isPrivateMember(node)) {
      cuts.push({ start: node.start, end: node.end, text: '' });
      return false;
    }
    if (node.type === 'VariableDeclarator' && isNode(node.id) && isNode(node.id.typeAnnotation) && isNode(node.init)) {
      // `const x: T = …` → `declare const x: T` — the initializer is implementation, the type is API.
      const variable = ancestors[ancestors.length - 1];
      if (
        variable?.type === 'VariableDeclaration' &&
        Array.isArray(variable.declarations) &&
        variable.declarations.length === 1
      ) {
        cuts.push({ start: variable.start, end: variable.start, text: 'declare ' });
        cuts.push({ start: node.id.end, end: node.init.end, text: '' });
        return false;
      }
    }
    if (LITERAL_NODES.has(node.type)) {
      const depth = ancestors.filter((ancestor) => LITERAL_NODES.has(ancestor.type)).length + 1;
      literals.push({ node, depth });
      if (depth > LITERAL_DEPTH) {
        cuts.push({ start: node.start + 1, end: node.end - 1, text: ' /*...*/ ' });
        return false;
      }
    }
    return undefined;
  });

  let snippet = splice(source, statement.start, statement.end, cuts);
  // A class member is not a top-level statement; the enclosing header is what makes the snippet
  // parse, and it also says where the member lives.
  const wrap = (text: string) =>
    statement.type === 'PropertyDefinition' || statement.type === 'MethodDefinition'
      ? `class ${declaration.name.split('.')[0]} {\n  ${text}\n}`
      : text;
  snippet = wrap(snippet);
  // Over budget: collapse the deepest kept literal bodies first, until it fits or nothing is left.
  for (let depth = LITERAL_DEPTH; depth >= 1 && snippet.length > SNIPPET_BUDGET; depth--) {
    for (const literal of literals) {
      if (literal.depth === depth) {
        cuts.push({ start: literal.node.start + 1, end: literal.node.end - 1, text: ' /*...*/ ' });
      }
    }
    snippet = wrap(splice(source, statement.start, statement.end, cuts));
  }
  return snippet.length > SNIPPET_HARD_CAP ? undefined : snippet;
};

// ---------------------------------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------------------------------

const docOf = (
  source: string,
  statement: Node,
  comments: readonly Comment[],
): { doc?: string; deprecated?: boolean } => {
  const leading = comments
    .filter((comment) => comment.type === 'Block' && comment.value.startsWith('*') && comment.end <= statement.start)
    .filter((comment) => source.slice(comment.end, statement.start).trim() === '')
    .at(-1);
  if (!leading) {
    return {};
  }
  const lines = leading.value.split('\n').map((line) => line.replace(/^\s*\*+ ?/, '').trim());
  const deprecated = lines.some((line) => line.startsWith('@deprecated'));
  const summary: string[] = [];
  for (const line of lines) {
    if (line.startsWith('@') || (line === '' && summary.length > 0)) {
      break;
    }
    if (line !== '') {
      summary.push(line);
    }
  }
  const text = summary.join(' ');
  return {
    ...(text.length > 0 ? { doc: text.length > 500 ? `${text.slice(0, 497)}...` : text } : {}),
    ...(deprecated ? { deprecated: true } : {}),
  };
};

// ---------------------------------------------------------------------------------------------------
// Analyzer
// ---------------------------------------------------------------------------------------------------

const lineOf = (source: string, offset: number): number => {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index++) {
    if (source[index] === '\n') {
      line++;
    }
  }
  return line;
};

const unique = (values: Iterable<string>): string[] => [...new Set(values)];

/**
 * Parse one file and set up type inference over it — the analyzer's own path, exposed so the
 * agreement harness scores exactly what the index emits.
 */
export const inferFile = (context: AnalyzeContext) => {
  const parsed = parseSync(context.path, context.source);
  const bindings = new Map<string, ImportBinding>();
  for (const statement of (parsed.program.body as readonly unknown[]).filter(isNode)) {
    if (
      statement.type === 'ImportDeclaration' &&
      isNode(statement.source) &&
      typeof statement.source.value === 'string'
    ) {
      for (const binding of importBindings(statement, resolveSpecifier(context, statement.source.value))) {
        bindings.set(binding.local, binding);
      }
    }
  }
  const program = programNode(parsed);
  return { parsed, program, bindings, inference: infer({ path: context.path, program, imports: bindings }) };
};

/** The program as a walkable node: oxc's `Program` is one, but its interface is not indexable. */
const programNode = (parsed: ReturnType<typeof parseSync>): Node => {
  const program: unknown = parsed.program;
  if (!isNode(program)) {
    throw new Error('oxc returned a program without a position');
  }
  return program;
};

export const analyzeTypeScript = (context: AnalyzeContext): Ontology.FileDocument => {
  const { source, path } = context;
  const base = fileNode(context);
  const parsed = parseSync(path, source);
  const errors = parsed.errors.map((error) => error.message);
  const body: Statement[] = parsed.program.body;

  // Import bindings, and per-specifier bookkeeping for the file-level edges.
  const bindings = new Map<string, ImportBinding>();
  /** Bare specifiers that resolved inside the repository: how the cross-file pass reaches a member's declaration. */
  const modules = new Map<string, string>();
  const resolveModule = (specifier: string): Resolution => {
    const resolution = resolveSpecifier(context, specifier);
    if (resolution.bare && resolution.file) {
      modules.set(specifier, resolution.file);
    }
    return resolution;
  };
  const specifiers = new Map<string, { resolution: Resolution; typeOnly: boolean; usedAsValue: boolean }>();
  const specifierOf = (specifier: string, typeOnly: boolean) => {
    const existing = specifiers.get(specifier);
    if (existing) {
      existing.typeOnly &&= typeOnly;
      return existing;
    }
    const created = { resolution: resolveModule(specifier), typeOnly, usedAsValue: false };
    specifiers.set(specifier, created);
    return created;
  };

  const reexports = new Set<string>();
  const importsModule = new Set<string>();
  const aliases: Array<{ name: string; origin: string | undefined; line: number; typeOnly: boolean }> = [];
  /** `export * as N from './y'` — the name under which a whole module is published. */
  const namespaces: Array<{ name: string; module: string; line: number }> = [];

  for (const statement of (body as readonly unknown[]).filter(isNode)) {
    if (
      statement.type === 'ImportDeclaration' &&
      isNode(statement.source) &&
      typeof statement.source.value === 'string'
    ) {
      const specifier = statement.source.value;
      const declarationTypeOnly = statement.importKind === 'type';
      const entry = specifierOf(
        specifier,
        declarationTypeOnly || (Array.isArray(statement.specifiers) && statement.specifiers.length > 0),
      );
      const specifierNodes = Array.isArray(statement.specifiers) ? statement.specifiers.filter(isNode) : [];
      if (specifierNodes.length === 0) {
        // A side-effect import is a value import.
        entry.usedAsValue = true;
        entry.typeOnly = false;
      }
      for (const binding of importBindings(statement, entry.resolution)) {
        if (!binding.typeOnly) {
          entry.typeOnly = false;
        }
        bindings.set(binding.local, binding);
      }
    } else if (
      (statement.type === 'ExportAllDeclaration' || statement.type === 'ExportNamedDeclaration') &&
      isNode(statement.source) &&
      typeof statement.source.value === 'string'
    ) {
      const resolution = resolveModule(statement.source.value);
      if (resolution.file) {
        reexports.add(Ontology.fileIri(resolution.file).value);
      } else {
        importsModule.add(statement.source.value);
      }
      // `export * as N from './y'` publishes the whole module under one name, which is what makes
      // the canonical name of everything in it `N.<identifier>`. The name lives here and the
      // identifiers live in the other file, so only a rule can join them.
      if (statement.type === 'ExportAllDeclaration' && resolution.file) {
        const namespaceName = nameOf(isNode(statement.exported) ? statement.exported : undefined);
        if (namespaceName) {
          namespaces.push({
            name: namespaceName,
            module: Ontology.fileIri(resolution.file).value,
            line: lineOf(source, statement.start),
          });
        }
      }

      // A named re-export declares the name it exports. Recording what it stands for is what lets a
      // rule see through a barrel: this repo addresses most things through one.
      const specifierNodes = Array.isArray(statement.specifiers) ? statement.specifiers.filter(isNode) : [];
      for (const node of specifierNodes) {
        const exportedName = nameOf(isNode(node.exported) ? node.exported : undefined);
        const localName = nameOf(isNode(node.local) ? node.local : undefined);
        if (!exportedName) {
          continue;
        }
        const origin = resolution.file
          ? Ontology.symbolIri(resolution.file, localName ?? exportedName).value
          : resolution.bare
            ? Ontology.memberIri(statement.source.value, localName ?? exportedName).value
            : undefined;
        aliases.push({
          name: exportedName,
          origin,
          line: lineOf(source, node.start),
          typeOnly: statement.exportKind === 'type' || node.exportKind === 'type',
        });
      }
    }
  }

  // Dynamic imports bind nothing; besides the file-level edge, the declaration enclosing one `loads` it.
  const dynamicImports: Array<{ readonly start: number; readonly specifier: string }> = [];
  for (const entry of parsed.module.dynamicImports) {
    const literal = source.slice(entry.moduleRequest.start, entry.moduleRequest.end).replace(/^['"`]|['"`]$/g, '');
    if (!literal.includes('${')) {
      specifierOf(literal, false).usedAsValue = true;
      dynamicImports.push({ start: entry.start, specifier: literal });
    }
  }

  const declared = declarations(body);
  const inference = infer({ path, program: programNode(parsed), imports: bindings });
  const types = TypeRdf.collector();
  /** `hasType`, and the term as JSON with literal freshness intact, for the cross-file pass to bind. */
  const typeFacts = (declaration: Declaration): { hasType?: string; typeTerm?: string } => {
    if (declaration.kind !== 'variable' && declaration.kind !== 'function') {
      return {};
    }
    const type = inference.declaration(declaration.node);
    const iri = types.add(type);
    return iri ? { hasType: iri, typeTerm: JSON.stringify(Term.toJson(type)) } : {};
  };
  const locals = new Map(
    declared.map((declaration) => [declaration.name, Ontology.symbolIri(path, declaration.name).value]),
  );

  let unresolved = 0;

  const namespaceNames = new Set(
    declared.filter((declaration) => declaration.kind === 'namespace').map((declaration) => declaration.name),
  );
  /** The namespaces enclosing a declaration, innermost first. */
  const namespacesOf = (name: string): string[] => {
    const segments = name.split('.');
    return segments
      .map((_, index) => segments.slice(0, segments.length - index).join('.'))
      .filter((prefix) => namespaceNames.has(prefix));
  };
  /** The namespaces enclosing the declaration being analyzed, innermost first; set per declaration. */
  let scope: readonly string[] = [];
  /** A name declared in an enclosing `namespace` shadows imports and top-level declarations. */
  const scopedLocal = (name: string): string | undefined =>
    scope.map((namespace) => locals.get(`${namespace}.${name}`)).find((iri) => iri !== undefined);

  /** IRIs a reference stands for, marking the binding's value use on the way. */
  const targetsOf = (reference: Reference): string[] => {
    const inner = scopedLocal(reference.name);
    if (inner) {
      return [inner];
    }
    const binding = bindings.get(reference.name);
    if (binding) {
      if (!reference.type) {
        const entry = specifiers.get(binding.specifier);
        if (entry) {
          entry.usedAsValue = true;
        }
      }
      return bindingTargets(binding, reference.path);
    }
    const local = locals.get(reference.name);
    if (local) {
      return [local];
    }
    if (!ES_GLOBALS.has(reference.name)) {
      unresolved++;
    }
    return [];
  };

  /**
   * Where a reference lands, without the bookkeeping of {@link targetsOf}, plus the part of its path
   * the symbol IRI did not consume: `import { NS } from '#types'` lands `NS.Cap` on `NS`, leaving `Cap`.
   */
  const landingOf = (ref: ExpressionRef): { targets: string[]; rest: readonly string[] } => {
    const inner = scopedLocal(ref.name);
    if (inner) {
      return { targets: [inner], rest: ref.path };
    }
    const binding = bindings.get(ref.name);
    if (binding) {
      const rest = !binding.file ? [] : binding.imported === '*' ? ref.path.slice(1) : ref.path;
      return { targets: bindingTargets(binding, ref.path), rest };
    }
    const local = locals.get(ref.name);
    return local ? { targets: [local], rest: ref.path } : { targets: [], rest: [] };
  };

  const passesOf = (self: string, node: Node): Ontology.ArgumentNode[] => {
    const nodes = new Map<string, Ontology.ArgumentNode>();
    for (const { callee, slot, ref } of passedRefsOf(node)) {
      const to = landingOf(callee);
      const from = landingOf(ref);
      if (to.targets.length === 0 || from.targets.length === 0) {
        continue;
      }
      const key = [callee.name, ...callee.path].join('.') + `/${slot}/` + [ref.name, ...ref.path].join('.');
      nodes.set(key, {
        '@id': `${self}~${escapeFragment(key)}`,
        '@type': 'Argument',
        'callee': to.targets,
        ...(to.rest.length > 0 ? { calleePath: to.rest.join('.') } : {}),
        'slot': slot,
        'reference': from.targets,
        ...(from.rest.length > 0 ? { referencePath: from.rest.join('.') } : {}),
      });
    }
    return [...nodes.values()];
  };

  const passesLiteralOf = (self: string, node: Node): Ontology.LiteralArgumentNode[] =>
    passedLiteralsOf(node).flatMap(({ callee, slot, value, start }) => {
      const to = landingOf(callee);
      return to.targets.length === 0
        ? []
        : [
            {
              '@id': `${self}~${escapeFragment([callee.name, ...callee.path].join('.'))}/${slot}@${start}`,
              '@type': 'Argument' as const,
              'callee': to.targets,
              ...(to.rest.length > 0 ? { calleePath: to.rest.join('.') } : {}),
              'slot': slot,
              'literal': value,
            },
          ];
    });

  const symbols: Ontology.SymbolNode[] = declared.map((declaration) => {
    scope = namespacesOf(declaration.name);
    const api = new Set<string>();
    const impl = new Set<string>();
    const self = Ontology.symbolIri(path, declaration.name).value;

    walk(declaration.statement, [], (node, ancestors) => {
      if (node.type !== 'Identifier' && node.type !== 'JSXIdentifier') {
        return undefined;
      }
      const parent = ancestors[ancestors.length - 1];
      if (isBindingPosition(node, parent) || isParameterBinding(node, parent)) {
        return undefined;
      }
      const name = nameOf(node);
      if (!name || (node.type === 'JSXIdentifier' && !/^[A-Z]/.test(name) && parent?.type !== 'JSXMemberExpression')) {
        return undefined;
      }
      // A statement declaring several variables attributes each reference to the declarator it sits in.
      if (declaration.node !== declaration.statement && declaration.node.type === 'VariableDeclarator') {
        if (node.start < declaration.node.start || node.end > declaration.node.end) {
          return undefined;
        }
      }
      const chain = chainOf(node, ancestors);
      if (!chain) {
        return undefined;
      }
      const targets = targetsOf({ name, path: chain.path, type: inTypePosition(ancestors, node) });
      for (const target of targets) {
        if (target === self) {
          continue;
        }
        (inTypePosition(ancestors, node) ? api : impl).add(target);
      }
      return undefined;
    });

    const refsToIris = (refs: readonly ExpressionRef[]): string[] =>
      unique(
        refs.flatMap((ref) => targetsOf({ name: ref.name, path: ref.path, type: false })).filter((iri) => iri !== self),
      );

    let construction: Construction = { constructedBy: [], pipedThrough: [], derivedFrom: [], argument: [] };
    const extendsRefs: ExpressionRef[] = [];
    const initializer =
      declaration.node.type === 'VariableDeclarator' && isNode(declaration.node.init)
        ? declaration.node.init
        : declaration.node.type === 'PropertyDefinition' && isNode(declaration.node.value)
          ? declaration.node.value
          : // `export default Capability.makeModule(…)` declares a value with no binding of its
            // own: the exported expression is its initializer.
            declaration.statement.type === 'ExportDefaultDeclaration' && declaration.node !== declaration.statement
            ? declaration.node
            : undefined;
    if (initializer) {
      construction = constructionOf(initializer);
    } else if (declaration.node.type === 'ClassDeclaration' || declaration.node.type === 'ClassExpression') {
      if (isNode(declaration.node.superClass)) {
        const ref = expressionRef(headCallee(declaration.node.superClass).callee);
        if (ref) {
          extendsRefs.push(ref);
        }
      }
    } else if (declaration.node.type === 'TSInterfaceDeclaration' && Array.isArray(declaration.node.extends)) {
      for (const heritage of declaration.node.extends.filter(isNode)) {
        const ref = isNode(heritage.expression) ? expressionRef(heritage.expression) : undefined;
        if (ref) {
          extendsRefs.push(ref);
        }
      }
    }

    return {
      '@id': self,
      '@type': 'Symbol',
      'name': declaration.name,
      'kind': declaration.kind,
      'exported': declaration.exported,
      'line': lineOf(source, declaration.offset),
      'extends': refsToIris(extendsRefs),
      'constructedBy': refsToIris(construction.constructedBy),
      ...((rest) => (rest.length === 0 ? {} : { constructedByPath: rest.join('.') }))(
        construction.constructedBy.flatMap((ref) => landingOf(ref).rest),
      ),
      'pipedThrough': refsToIris(construction.pipedThrough),
      'derivedFrom': refsToIris(construction.derivedFrom),
      'argument': refsToIris(construction.argument),
      'apiDependsOn': [...api],
      'implDependsOn': [...impl],
      'aliasOf': [],
      ...((passes) => (passes.length === 0 ? {} : { passes }))(passesOf(self, declaration.node)),
      ...((literals) => (literals.length === 0 ? {} : { passesLiteral: literals }))(
        passesLiteralOf(self, declaration.node),
      ),
      ...((loads) => (loads.length === 0 ? {} : { loads }))(
        unique(
          dynamicImports
            .filter(({ start }) => start >= declaration.node.start && start < declaration.node.end)
            .flatMap(({ specifier }) => {
              const file = specifiers.get(specifier)?.resolution.file;
              return file ? [Ontology.fileIri(file).value] : [];
            }),
        ),
      ),
      ...((value) => (value === undefined ? {} : { snippet: value }))(snippetOf(source, declaration, parsed.comments)),
      ...docOf(source, declaration.statement, parsed.comments),
      ...typeFacts(declaration),
    };
  });

  // A statement declaring nothing (`describe(…)`, `registerX()`) runs at load time, so a binding it
  // references is a value import even though no symbol carries the edge.
  const markValueUse = (name: string): void => {
    const binding = bindings.get(name);
    const entry = binding && specifiers.get(binding.specifier);
    if (entry) {
      entry.usedAsValue = true;
    }
  };
  const declaringStatements = new Set<Node>(declared.map((declaration) => declaration.statement));
  for (const statement of (body as readonly unknown[]).filter(isNode)) {
    if (declaringStatements.has(statement)) {
      continue;
    }
    // `export { load }` re-exports a local binding, which keeps a value import alive at runtime.
    if (statement.type === 'ExportNamedDeclaration') {
      if (!isNode(statement.source) && statement.exportKind !== 'type' && Array.isArray(statement.specifiers)) {
        for (const specifier of statement.specifiers.filter(isNode)) {
          const name =
            specifier.exportKind === 'type' ? undefined : nameOf(isNode(specifier.local) ? specifier.local : undefined);
          if (name) {
            markValueUse(name);
          }
        }
      }
      continue;
    }
    if (MODULE_STATEMENTS.has(statement.type)) {
      continue;
    }
    walk(statement, [], (node, ancestors) => {
      if (node.type !== 'Identifier' && node.type !== 'JSXIdentifier') {
        return undefined;
      }
      const parent = ancestors[ancestors.length - 1];
      const name = nameOf(node);
      if (
        !name ||
        isBindingPosition(node, parent) ||
        isParameterBinding(node, parent) ||
        inTypePosition(ancestors, node) ||
        !chainOf(node, ancestors)
      ) {
        return undefined;
      }
      markValueUse(name);
      return undefined;
    });
  }

  const imports = new Set<string>();
  const importsType = new Set<string>();
  for (const [specifier, entry] of specifiers) {
    if (entry.resolution.file) {
      (entry.typeOnly || !entry.usedAsValue ? importsType : imports).add(Ontology.fileIri(entry.resolution.file).value);
    } else {
      importsModule.add(specifier);
    }
  }
  // An import used only in type positions is erased at runtime; one never used at all is treated as
  // a value import, since that is what the compiler emits for it.
  for (const [specifier, entry] of specifiers) {
    if (entry.resolution.file && !entry.typeOnly && !entry.usedAsValue) {
      const bound = [...bindings.values()].some((binding) => binding.specifier === specifier);
      if (!bound) {
        importsType.delete(Ontology.fileIri(entry.resolution.file).value);
        imports.add(Ontology.fileIri(entry.resolution.file).value);
      }
    }
  }

  const aliasSymbols: Ontology.SymbolNode[] = aliases
    .filter((alias) => alias.origin !== undefined && !symbols.some((declared) => declared.name === alias.name))
    .map((alias) => ({
      '@id': Ontology.symbolIri(path, alias.name).value,
      '@type': 'Symbol',
      'name': alias.name,
      'kind': 'reexport',
      'exported': true,
      'line': alias.line,
      'extends': [],
      'constructedBy': [],
      'pipedThrough': [],
      'derivedFrom': [],
      'argument': [],
      'apiDependsOn': alias.typeOnly && alias.origin ? [alias.origin] : [],
      'implDependsOn': !alias.typeOnly && alias.origin ? [alias.origin] : [],
      'aliasOf': alias.origin ? [alias.origin] : [],
    }));

  // The namespace is a symbol of this file like any other export — `Ontology` is what an importer
  // writes — and `namespaceOf` is the edge a rule follows to the identifiers it qualifies.
  const namespaceSymbols: Ontology.SymbolNode[] = namespaces
    .filter((namespace) => !symbols.some((declared) => declared.name === namespace.name))
    .map((namespace) => ({
      '@id': Ontology.symbolIri(path, namespace.name).value,
      '@type': 'Symbol',
      'name': namespace.name,
      'kind': 'namespace',
      'exported': true,
      'line': namespace.line,
      'extends': [],
      'constructedBy': [],
      'pipedThrough': [],
      'derivedFrom': [],
      'argument': [],
      'apiDependsOn': [],
      'implDependsOn': [],
      'aliasOf': [],
      'namespaceOf': [namespace.module],
    }));

  return {
    ...base,
    imports: [...imports],
    importsType: [...importsType].filter((iri) => !imports.has(iri)),
    importsModule: [...importsModule],
    reexports: [...reexports],
    unresolvedReferences: unresolved,
    declares: [...symbols, ...aliasSymbols, ...namespaceSymbols],
    ...((nodes) => (nodes.length > 0 ? { '@included': nodes } : {}))([
      ...types.nodes(),
      ...[...modules].map(([specifier, file]): Ontology.ModuleNode => ({
        '@id': Ontology.moduleIri(specifier).value,
        '@type': 'Module',
        'moduleFile': Ontology.fileIri(file).value,
      })),
      ...callSitesOf({
        program: programNode(parsed),
        path,
        source,
        declared,
        land: (ref, enclosing) => {
          scope = enclosing === undefined ? [] : namespacesOf(enclosing);
          return landingOf(ref);
        },
      }),
    ]),
    ...(errors.length > 0 ? { parseError: errors } : {}),
  };
};

/** oxc resolver over the repository, with the extension set the indexer walks. */
export { createResolver } from './resolver.ts';

export const isTypeScriptPath = (path: string): boolean => /\.(m|c)?[jt]sx?$/.test(path);

// Exposed for tests.
export const internal = { constructionOf, inTypePosition, resolvePath, dirname };
