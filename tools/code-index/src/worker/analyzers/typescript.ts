//
// Copyright 2026 DXOS.org
//

import { dirname, isAbsolute, relative, resolve as resolvePath } from 'node:path';
import { parseSync } from 'oxc-parser';

import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext, fileNode } from './common.ts';

/**
 * TypeScript/JavaScript files: declarations, what constructs them, what they reference and from
 * which position, and a definition snippet — all structural. Nothing here names a framework; that
 * is the rule files' job (`design/ONTOLOGY.md`, "The parser asserts structure; rules assert
 * meaning").
 */

// The AST types come from the parser's own return type: `@oxc-project/types` is also published
// standalone and the two copies are not structurally interchangeable.
type ParseResult = ReturnType<typeof parseSync>;
type Program = ParseResult['program'];
type Statement = Program['body'][number];
type Comment = ParseResult['comments'][number];

/** Any AST node: every oxc node carries `type`, `start`, `end`; the rest is walked generically. */
type Node = { type: string; start: number; end: number; [key: string]: unknown };

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string' &&
  typeof (value as { start?: unknown }).start === 'number';

const children = (node: Node): Node[] => {
  const found: Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') {
      continue;
    }
    if (isNode(value)) {
      found.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          found.push(item);
        }
      }
    }
  }
  return found;
};

/** Depth-first walk with the ancestor chain; the visitor returns `false` to skip a subtree. */
const walk = (node: Node, ancestors: Node[], visit: (node: Node, ancestors: Node[]) => boolean | undefined): void => {
  if (visit(node, ancestors) === false) {
    return;
  }
  ancestors.push(node);
  for (const child of children(node)) {
    walk(child, ancestors, visit);
  }
  ancestors.pop();
};

const nameOf = (node: Node | undefined): string | undefined =>
  node && (node.type === 'Identifier' || node.type === 'JSXIdentifier') && typeof node.name === 'string'
    ? node.name
    : undefined;

// ---------------------------------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------------------------------

type ImportBinding = {
  readonly local: string;
  readonly specifier: string;
  /** The imported name, `*` for a namespace import, `default` for the default export. */
  readonly imported: string;
  readonly typeOnly: boolean;
  /** Repo-relative path the specifier resolved to inside the repository, if any. */
  readonly file: string | undefined;
  /** Bare specifiers keep a module-member addressing; relative ones do not. */
  readonly bare: boolean;
};

type Resolution = { readonly file: string | undefined; readonly bare: boolean };

const resolveSpecifier = (context: AnalyzeContext, specifier: string): Resolution => {
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

/**
 * Initialized static members: the companion-object pattern (`static layerEmpty = Layer.succeed(…)`)
 * declares module-level values under a class, and they are as much API as a top-level `const`.
 */
const staticMembers = (node: Node, className: string, exported: boolean): Declaration[] => {
  const body = isNode(node.body) && Array.isArray(node.body.body) ? node.body.body.filter(isNode) : [];
  return body.flatMap((member) => {
    if (
      member.type !== 'PropertyDefinition' ||
      member.static !== true ||
      !isNode(member.value) ||
      isPrivateMember(member)
    ) {
      return [];
    }
    const key = keyNameOf(member);
    return key
      ? [
          {
            name: `${className}.${key}`,
            kind: 'variable',
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

export const analyzeTypeScript = (context: AnalyzeContext): Ontology.FileDocument => {
  const { source, path } = context;
  const base = fileNode(context);
  const parsed = parseSync(path, source);
  const errors = parsed.errors.map((error) => error.message);
  const body: Statement[] = parsed.program.body;

  // Import bindings, and per-specifier bookkeeping for the file-level edges.
  const bindings = new Map<string, ImportBinding>();
  const specifiers = new Map<string, { resolution: Resolution; typeOnly: boolean; usedAsValue: boolean }>();
  const specifierOf = (specifier: string, typeOnly: boolean) => {
    const existing = specifiers.get(specifier);
    if (existing) {
      existing.typeOnly &&= typeOnly;
      return existing;
    }
    const created = { resolution: resolveSpecifier(context, specifier), typeOnly, usedAsValue: false };
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
      for (const node of specifierNodes) {
        const local = nameOf(isNode(node.local) ? node.local : undefined);
        if (!local) {
          continue;
        }
        const imported =
          node.type === 'ImportNamespaceSpecifier'
            ? '*'
            : node.type === 'ImportDefaultSpecifier'
              ? 'default'
              : (nameOf(isNode(node.imported) ? node.imported : undefined) ??
                (isNode(node.imported) && typeof node.imported.value === 'string' ? node.imported.value : local));
        const typeOnly = declarationTypeOnly || node.importKind === 'type';
        if (!typeOnly) {
          entry.typeOnly = false;
        }
        bindings.set(local, {
          local,
          specifier,
          imported,
          typeOnly,
          file: entry.resolution.file,
          bare: entry.resolution.bare,
        });
      }
    } else if (
      (statement.type === 'ExportAllDeclaration' || statement.type === 'ExportNamedDeclaration') &&
      isNode(statement.source) &&
      typeof statement.source.value === 'string'
    ) {
      const resolution = resolveSpecifier(context, statement.source.value);
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

  // Dynamic imports are file-level edges only; they bind nothing.
  for (const entry of parsed.module.dynamicImports) {
    const literal = source.slice(entry.moduleRequest.start, entry.moduleRequest.end).replace(/^['"`]|['"`]$/g, '');
    if (!literal.includes('${')) {
      specifierOf(literal, false).usedAsValue = true;
    }
  }

  const declared = declarations(body);
  const locals = new Map(
    declared.map((declaration) => [declaration.name, Ontology.symbolIri(path, declaration.name).value]),
  );

  let unresolved = 0;

  /** IRIs a reference stands for, marking the binding's value use on the way. */
  const targetsOf = (reference: Reference): string[] => {
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

  const symbols: Ontology.SymbolNode[] = declared.map((declaration) => {
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
      'pipedThrough': refsToIris(construction.pipedThrough),
      'derivedFrom': refsToIris(construction.derivedFrom),
      'argument': refsToIris(construction.argument),
      'apiDependsOn': [...api],
      'implDependsOn': [...impl],
      'aliasOf': [],
      ...((value) => (value === undefined ? {} : { snippet: value }))(snippetOf(source, declaration, parsed.comments)),
      ...docOf(source, declaration.statement, parsed.comments),
    };
  });

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
    ...(errors.length > 0 ? { parseError: errors } : {}),
  };
};

/** oxc resolver over the repository, with the extension set the indexer walks. */
export { createResolver } from './resolver.ts';

export const isTypeScriptPath = (path: string): boolean => /\.(m|c)?[jt]sx?$/.test(path);

// Exposed for tests.
export const internal = { constructionOf, inTypePosition, resolvePath, dirname };
