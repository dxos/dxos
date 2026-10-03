//
// Copyright 2026 DXOS.org
//

import * as Ontology from '../../Ontology.ts';
import { type Node, child, childList, isNode, nameOf, walk } from '../analyzers/ast.ts';
import { type ImportBinding, boundaryIri } from './Boundary.ts';
import { type GeneratorSummary, type Model, type ModelContext, MODELS } from './models.ts';
import { type PatternStep, type Scopes, type ValueDeclaration, buildScopes, isFunctionNode } from './Scope.ts';
import * as Term from './Term.ts';

/**
 * Local type propagation over one file's AST — `design/TYPES.md`. Every rule either yields what
 * `tsc` would, or {@link Term.unknown}. Memoized per node; cycles bail out.
 */

export type InferContext = {
  /** Repo-relative path: local declarations are named by it. */
  readonly path: string;
  readonly program: Node;
  readonly imports: ReadonlyMap<string, ImportBinding>;
};

export type Inference = {
  /** The type of the value a top-level declaration introduces (declarator, function, static member). */
  readonly declaration: (node: Node) => Term.Type;
  /** The type of the variable an identifier in a binding position declares. */
  readonly binding: (identifier: Node) => Term.Type;
  readonly expression: (node: Node) => Term.Type;
  readonly scopes: Scopes;
};

/** Global types the propagator names as `lib:<name>`, with their arity and trailing defaults. */
const LIB_TYPES: Record<string, { arity: number; defaults: readonly Term.Type[] }> = {
  Array: { arity: 1, defaults: [] },
  ReadonlyArray: { arity: 1, defaults: [] },
  Promise: { arity: 1, defaults: [] },
  PromiseLike: { arity: 1, defaults: [] },
  Map: { arity: 2, defaults: [] },
  Set: { arity: 1, defaults: [] },
  ReadonlyMap: { arity: 2, defaults: [] },
  ReadonlySet: { arity: 1, defaults: [] },
  WeakMap: { arity: 2, defaults: [] },
  WeakSet: { arity: 1, defaults: [] },
  Record: { arity: 2, defaults: [] },
  Partial: { arity: 1, defaults: [] },
  Required: { arity: 1, defaults: [] },
  Readonly: { arity: 1, defaults: [] },
  Pick: { arity: 2, defaults: [] },
  Omit: { arity: 2, defaults: [] },
  Date: { arity: 0, defaults: [] },
  RegExp: { arity: 0, defaults: [] },
  Error: { arity: 0, defaults: [] },
  URL: { arity: 0, defaults: [] },
};

/** Utility aliases over objects: applied to a primitive, array or tuple, `tsc` reduces them away. */
const MAPPED_LIB_TYPES = new Set(['Partial', 'Required', 'Readonly', 'Pick', 'Omit']);

/** Global constructors whose instance type is the global type of the same name. */
const LIB_CONSTRUCTORS = new Set(['Date', 'RegExp', 'Error', 'URL', 'Map', 'Set', 'WeakMap', 'WeakSet']);

/** Alias right-hand sides that make a new type, to which `tsc` attaches the alias name. */
const NAMING_ALIAS_TARGETS = new Set([
  'TSUnionType',
  'TSIntersectionType',
  'TSTypeLiteral',
  'TSFunctionType',
  'TSConstructorType',
  'TSMappedType',
  'TSConditionalType',
  'TSIndexedAccessType',
  'TSTemplateLiteralType',
]);

const TYPEOF_RESULT = Term.union(
  ['string', 'number', 'bigint', 'boolean', 'symbol', 'undefined', 'object', 'function'].map((name) =>
    Term.literal(name),
  ),
);

const isPrimitiveLike = (type: Term.Type): boolean => type.kind === 'primitive' || type.kind === 'literal';

/** Whether a type is known to be number-like, string-like, or bigint-like, through unions. */
const all = (type: Term.Type, test: (member: Term.Type) => boolean): boolean =>
  type.kind === 'union' ? type.members.every((member) => all(member, test)) : test(type);

const isNumberLike = (type: Term.Type) =>
  all(
    type,
    (member) =>
      (member.kind === 'primitive' && member.name === 'number') ||
      (member.kind === 'literal' && typeof member.value === 'number'),
  );

const isStringLike = (type: Term.Type) =>
  all(
    type,
    (member) =>
      (member.kind === 'primitive' && member.name === 'string') ||
      (member.kind === 'literal' && typeof member.value === 'string'),
  );

const isBigIntLike = (type: Term.Type) =>
  all(
    type,
    (member) =>
      (member.kind === 'primitive' && member.name === 'bigint') ||
      (member.kind === 'literal' && typeof member.value === 'bigint'),
  );

/**
 * A union `tsc` builds with subtype reduction (return types, conditionals, array elements) equals the
 * plain union only when no member could be a subtype of another; primitives and literals are
 * handled by absorption, so more than one structured member is a bail-out.
 */
const reducedUnion = (members: readonly Term.Type[]): Term.Type => {
  const joined = Term.union(members);
  const parts = joined.kind === 'union' ? joined.members : [joined];
  const structured = parts.filter((member) => !isPrimitiveLike(member) && member.kind !== 'unknown');
  return structured.length > 1 ? Term.unknown : joined;
};

const isTypeParamAtTopLevel = (type: Term.Type, name: string): boolean =>
  (type.kind === 'param' && type.name === name) ||
  ((type.kind === 'union' || type.kind === 'intersection') &&
    type.members.some((member) => isTypeParamAtTopLevel(member, name)));

const stripParens = (node: Node): Node => {
  let current = node;
  while (current.type === 'ParenthesizedExpression' && isNode(current.expression)) {
    current = current.expression;
  }
  return current;
};

const isConstAssertion = (node: Node): boolean => {
  const annotation = child(node, 'typeAnnotation');
  return (
    annotation?.type === 'TSTypeReference' &&
    nameOf(child(annotation, 'typeName')) === 'const' &&
    child(annotation, 'typeArguments') === undefined
  );
};

const propertyKey = (node: Node): string | undefined => {
  if (node.computed === true) {
    const key = child(node, 'key');
    return key?.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number')
      ? String(key.value)
      : undefined;
  }
  const key = child(node, 'key');
  return (
    nameOf(key) ??
    (key && (typeof key.value === 'string' || typeof key.value === 'number') ? String(key.value) : undefined)
  );
};

export const infer = (context: InferContext): Inference => {
  const scopes = buildScopes(context.program, context.imports);
  const expressionCache = new Map<Node, Term.Type>();
  const declarationCache = new Map<Node, Term.Type>();
  const annotationCache = new Map<Node, Term.Type>();
  const inProgress = new Map<Map<Node, Term.Type>, Set<Node>>();

  /** Memoize `compute` per node, returning unknown on re-entry (a cycle). */
  const memo = (cache: Map<Node, Term.Type>, node: Node, compute: () => Term.Type): Term.Type => {
    const cached = cache.get(node);
    if (cached) {
      return cached;
    }
    // One in-progress set per cache: an expression and the declaration it is may share a node.
    let active = inProgress.get(cache);
    if (!active) {
      active = new Set();
      inProgress.set(cache, active);
    }
    if (active.has(node)) {
      return Term.unknown;
    }
    active.add(node);
    try {
      const computed = compute();
      cache.set(node, computed);
      return computed;
    } finally {
      active.delete(node);
    }
  };

  const isTopLevel = (scope: Node) => scope === scopes.program;

  const localIri = (name: string) => Ontology.symbolIri(context.path, name).value;

  //
  // Type syntax.
  //

  const annotationOf = (node: Node | undefined): Node | undefined => {
    const annotation = node ? child(node, 'typeAnnotation') : undefined;
    return annotation?.type === 'TSTypeAnnotation' ? child(annotation, 'typeAnnotation') : annotation;
  };

  const returnAnnotation = (fn: Node): Node | undefined => {
    const returnType = child(fn, 'returnType');
    return returnType ? (child(returnType, 'typeAnnotation') ?? returnType) : undefined;
  };

  const typeArgumentsOf = (node: Node): Node[] | undefined => {
    const instantiation = child(node, 'typeArguments');
    return instantiation ? childList(instantiation, 'params') : undefined;
  };

  /** Type parameters as declared; `undefined` when any has a constraint, default, or modifier we do not model. */
  const simpleTypeParams = (owner: Node): string[] | undefined => {
    const declaration = child(owner, 'typeParameters');
    const params = declaration ? childList(declaration, 'params') : [];
    const names: string[] = [];
    for (const param of params) {
      const name = nameOf(child(param, 'name'));
      if (
        !name ||
        child(param, 'constraint') ||
        child(param, 'default') ||
        param.const === true ||
        param.in === true ||
        param.out === true
      ) {
        return undefined;
      }
      names.push(name);
    }
    return names;
  };

  /** Type arguments for a declaration, defaults filled; `undefined` when the count is wrong. */
  const applyArguments = (owner: Node, written: readonly Term.Type[]): Term.Type[] | undefined => {
    const declaration = child(owner, 'typeParameters');
    const params = declaration ? childList(declaration, 'params') : [];
    if (written.length > params.length) {
      return undefined;
    }
    const args = [...written];
    for (let index = written.length; index < params.length; index++) {
      const fallback = child(params[index], 'default');
      if (!fallback) {
        return undefined;
      }
      // A default naming an earlier parameter would need substitution; keep only closed defaults.
      const value = typeFromSyntax(fallback);
      if (Term.isPartial(value) || params.some((param) => Term.mentions(value, nameOf(child(param, 'name')) ?? ''))) {
        return undefined;
      }
      args.push(value);
    }
    return args;
  };

  const typeFromSyntax = (node: Node): Term.Type => memo(annotationCache, node, () => convertSyntax(node));

  const convertSyntax = (node: Node): Term.Type => {
    switch (node.type) {
      case 'TSStringKeyword':
        return Term.string;
      case 'TSNumberKeyword':
        return Term.number;
      case 'TSBooleanKeyword':
        return Term.boolean;
      case 'TSBigIntKeyword':
        return Term.bigint;
      case 'TSSymbolKeyword':
        return Term.primitive('symbol');
      case 'TSNullKeyword':
        return Term.null_;
      case 'TSUndefinedKeyword':
        return Term.undefined_;
      case 'TSVoidKeyword':
        return Term.void_;
      case 'TSNeverKeyword':
        return Term.never;
      case 'TSAnyKeyword':
        return Term.any;
      case 'TSUnknownKeyword':
        return Term.primitive('unknown');
      case 'TSObjectKeyword':
        return Term.primitive('object');
      case 'TSParenthesizedType': {
        const inner = annotationOf(node);
        return inner ? typeFromSyntax(inner) : Term.unknown;
      }
      case 'TSLiteralType':
        return literalType(child(node, 'literal'));
      case 'TSUnionType':
        return Term.union(childList(node, 'types').map(typeFromSyntax));
      case 'TSIntersectionType': {
        const members = childList(node, 'types').map(typeFromSyntax);
        // Intersections with primitives or literals reduce (`string & 'a'` is `'a'`); not modeled.
        return members.some((member) => isPrimitiveLike(member) || member.kind === 'union')
          ? Term.unknown
          : Term.intersection(members);
      }
      case 'TSArrayType': {
        const element = child(node, 'elementType');
        return element ? Term.array(typeFromSyntax(element)) : Term.unknown;
      }
      case 'TSTypeOperator': {
        const operand = annotationOf(node);
        if (node.operator !== 'readonly' || !operand) {
          return Term.unknown;
        }
        if (operand.type === 'TSArrayType') {
          const element = child(operand, 'elementType');
          return element ? Term.lib('ReadonlyArray', [typeFromSyntax(element)]) : Term.unknown;
        }
        if (operand.type === 'TSTupleType') {
          const tuple = typeFromSyntax(operand);
          return tuple.kind === 'tuple' ? Term.tuple(tuple.elements, true) : Term.unknown;
        }
        return Term.unknown;
      }
      case 'TSTupleType':
        return tupleType(childList(node, 'elementTypes'));
      case 'TSTypeLiteral':
        return objectType(childList(node, 'members'));
      case 'TSFunctionType':
        return functionSyntax(node);
      case 'TSTypeReference':
        return typeReference(node);
      case 'TSTypeQuery':
        return typeQuery(node);
      default:
        return Term.unknown;
    }
  };

  const literalType = (literal: Node | undefined): Term.Type => {
    if (!literal) {
      return Term.unknown;
    }
    if (literal.type === 'Literal') {
      if (typeof literal.bigint === 'string') {
        return Term.literal(BigInt(literal.bigint));
      }
      return typeof literal.value === 'string' ||
        typeof literal.value === 'number' ||
        typeof literal.value === 'boolean'
        ? Term.literal(literal.value)
        : Term.unknown;
    }
    if (literal.type === 'UnaryExpression' && literal.operator === '-') {
      const argument = child(literal, 'argument');
      if (argument?.type === 'Literal' && typeof argument.value === 'number') {
        return Term.literal(-argument.value);
      }
      if (argument?.type === 'Literal' && typeof argument.bigint === 'string') {
        return Term.literal(-BigInt(argument.bigint));
      }
    }
    if (literal.type === 'TemplateLiteral' && childList(literal, 'expressions').length === 0) {
      const cooked = templateText(literal);
      return cooked === undefined ? Term.unknown : Term.literal(cooked);
    }
    return Term.unknown;
  };

  const templateText = (template: Node): string | undefined => {
    const quasi = childList(template, 'quasis')[0];
    const value = quasi?.value;
    return typeof value === 'object' && value !== null && 'cooked' in value && typeof value.cooked === 'string'
      ? value.cooked
      : undefined;
  };

  const tupleType = (elements: readonly Node[]): Term.Type => {
    const converted: Term.Element[] = [];
    for (const element of elements) {
      let current = element;
      let optional = false;
      let rest = false;
      if (current.type === 'TSRestType') {
        rest = true;
        const inner = annotationOf(current);
        if (!inner) {
          return Term.unknown;
        }
        current = inner;
      }
      if (current.type === 'TSNamedTupleMember') {
        optional = current.optional === true;
        const inner = child(current, 'elementType');
        if (!inner) {
          return Term.unknown;
        }
        current = inner;
      }
      if (current.type === 'TSOptionalType') {
        optional = true;
        const inner = annotationOf(current);
        if (!inner) {
          return Term.unknown;
        }
        current = inner;
      }
      let type = typeFromSyntax(current);
      if (rest) {
        // A rest element is written as an array; `tsc` records its element type.
        if (type.kind === 'ref' && type.iri === Term.libIri('Array') && type.args.length === 1) {
          type = type.args[0];
        } else {
          return Term.unknown;
        }
      }
      converted.push({ type: optional ? Term.without(type, ['undefined']) : type, optional, rest });
    }
    return Term.tuple(converted);
  };

  const objectType = (members: readonly Node[]): Term.Type => {
    const properties: Term.Property[] = [];
    const indexes: Term.IndexSignature[] = [];
    const seen = new Set<string>();
    for (const member of members) {
      if (member.type === 'TSPropertySignature') {
        const name = propertyKey(member);
        if (name === undefined || seen.has(name)) {
          return Term.unknown;
        }
        seen.add(name);
        const annotation = annotationOf(member);
        const type = annotation ? typeFromSyntax(annotation) : Term.any;
        const optional = member.optional === true;
        properties.push({
          name,
          type: optional ? Term.without(type, ['undefined']) : type,
          optional,
          readonly: member.readonly === true,
        });
      } else if (member.type === 'TSMethodSignature' && member.kind === 'method') {
        const name = propertyKey(member);
        if (name === undefined || seen.has(name)) {
          return Term.unknown;
        }
        seen.add(name);
        properties.push({ name, type: functionSyntax(member), optional: member.optional === true, readonly: false });
      } else if (member.type === 'TSIndexSignature') {
        const parameter = childList(member, 'parameters')[0];
        const key = parameter ? annotationOf(parameter) : undefined;
        const value = annotationOf(member);
        if (!key || !value) {
          return Term.unknown;
        }
        indexes.push({ key: typeFromSyntax(key), type: typeFromSyntax(value), readonly: member.readonly === true });
      } else {
        return Term.unknown;
      }
    }
    return Term.object(properties, indexes);
  };

  /** A function type from syntax: `TSFunctionType`, a method signature, or a declared function's header. */
  const functionSyntax = (node: Node): Term.Type => {
    const typeParams = simpleTypeParams(node);
    const returns = returnAnnotation(node);
    if (!typeParams || !returns) {
      return Term.unknown;
    }
    const params = parameters(node, true);
    return params ? Term.fn(params, typeFromSyntax(returns), typeParams) : Term.unknown;
  };

  const typeReference = (node: Node): Term.Type => {
    const name = child(node, 'typeName');
    if (!name) {
      return Term.unknown;
    }
    const written = typeArgumentsOf(node)?.map(typeFromSyntax) ?? [];
    // Qualified: `Effect.Effect<…>`, only through an import binding.
    if (name.type === 'TSQualifiedName') {
      const path: string[] = [];
      let root: Node | undefined = name;
      while (root?.type === 'TSQualifiedName') {
        const right = nameOf(child(root, 'right'));
        if (!right) {
          return Term.unknown;
        }
        path.unshift(right);
        root = child(root, 'left');
      }
      const rootName = nameOf(root);
      const declared = rootName ? scopes.type(rootName, node) : undefined;
      if (declared?.declaration.kind !== 'import') {
        return Term.unknown;
      }
      const iri = boundaryIri(declared.declaration.binding, path);
      return iri ? namedImport(iri, written, node) : Term.unknown;
    }
    const identifier = nameOf(name);
    if (!identifier) {
      return Term.unknown;
    }
    const declared = scopes.type(identifier, node);
    if (!declared) {
      return globalType(identifier, written, node);
    }
    const { declaration, scope } = declared;
    switch (declaration.kind) {
      case 'typeParam':
        return written.length === 0 ? Term.param(identifier) : Term.unknown;
      case 'import': {
        const iri = boundaryIri(declaration.binding, []);
        return iri ? namedImport(iri, written, node) : Term.unknown;
      }
      case 'interface':
      case 'class': {
        if (!isTopLevel(scope)) {
          return Term.unknown;
        }
        const args = applyArguments(declaration.node, written);
        return args ? Term.ref(localIri(identifier), args, node) : Term.unknown;
      }
      case 'alias': {
        if (!isTopLevel(scope)) {
          return Term.unknown;
        }
        return aliasReference(declaration.node, identifier, written, node);
      }
      default:
        return Term.unknown;
    }
  };

  /**
   * A reference to a local alias. `tsc` names the result after the alias unless the right-hand side
   * is a type it already has — a keyword, literal, array, tuple, or interface reference — and then
   * the alias is transparent. Naming is always TypeScript-equivalent; expanding is only done where
   * `tsc` certainly does.
   */
  const aliasReference = (alias: Node, name: string, written: readonly Term.Type[], origin: Term.Span): Term.Type => {
    const args = applyArguments(alias, written);
    let target = annotationOf(alias);
    while (target?.type === 'TSParenthesizedType') {
      target = annotationOf(target);
    }
    if (!args || !target) {
      return Term.unknown;
    }
    if (!isTransparentAliasTarget(target)) {
      return Term.ref(localIri(name), args, origin);
    }
    const params = childList(child(alias, 'typeParameters') ?? alias, 'params')
      .map((param) => nameOf(child(param, 'name')))
      .filter((param): param is string => param !== undefined);
    return Term.instantiate(typeFromSyntax(target), new Map(params.map((param, index) => [param, args[index]])));
  };

  /** Alias targets `tsc` does not attach the alias name to. */
  const isTransparentAliasTarget = (target: Node): boolean => {
    if (
      target.type.endsWith('Keyword') ||
      ['TSLiteralType', 'TSArrayType', 'TSTupleType', 'TSTypeQuery'].includes(target.type)
    ) {
      return true;
    }
    if (target.type === 'TSTypeOperator') {
      return target.operator === 'readonly';
    }
    if (target.type === 'TSTypeReference') {
      const resolved = typeFromSyntax(target);
      return (
        resolved.kind === 'ref' &&
        ((resolved.iri.startsWith(Term.LIB_BASE) &&
          !MAPPED_LIB_TYPES.has(resolved.iri.slice(Term.LIB_BASE.length)) &&
          resolved.iri !== Term.libIri('Record')) ||
          localDeclarationKind(resolved.iri) === 'interface' ||
          localDeclarationKind(resolved.iri) === 'class')
      );
    }
    return false;
  };

  /** Library types with known arity and defaults (see `models.ts`) get their defaults filled in. */
  const namedImport = (iri: string, written: readonly Term.Type[], origin: Term.Span): Term.Type => {
    const known = MODELS.types.get(iri);
    if (known) {
      if (written.length < known.arity - known.defaults.length || written.length > known.arity) {
        return Term.unknown;
      }
      return Term.ref(
        iri,
        [...written, ...known.defaults.slice(written.length - (known.arity - known.defaults.length))],
        origin,
      );
    }
    return Term.ref(iri, written, origin);
  };

  const globalType = (name: string, written: readonly Term.Type[], origin: Term.Span): Term.Type => {
    const known = LIB_TYPES[name];
    if (!known || written.length < known.arity - known.defaults.length || written.length > known.arity) {
      return Term.unknown;
    }
    if (
      MAPPED_LIB_TYPES.has(name) &&
      (written.length === 0 || !(written[0].kind === 'ref' || written[0].kind === 'object') || isArrayLike(written[0]))
    ) {
      return Term.unknown;
    }
    return Term.ref(
      Term.libIri(name),
      [...written, ...known.defaults.slice(written.length - (known.arity - known.defaults.length))],
      origin,
    );
  };

  const isArrayLike = (type: Term.Type) =>
    type.kind === 'tuple' ||
    (type.kind === 'ref' && (type.iri === Term.libIri('Array') || type.iri === Term.libIri('ReadonlyArray')));

  const typeQuery = (node: Node): Term.Type => {
    const name = child(node, 'exprName');
    if (!name || typeArgumentsOf(node)) {
      return Term.unknown;
    }
    if (name.type === 'Identifier') {
      const identifier = nameOf(name);
      const declared = identifier ? scopes.value(identifier, node) : undefined;
      if (!declared) {
        return Term.unknown;
      }
      return Term.settle(valueOf(declared.declaration, declared.scope, identifier ?? ''));
    }
    if (name.type === 'TSQualifiedName') {
      const path: string[] = [];
      let root: Node | undefined = name;
      while (root?.type === 'TSQualifiedName') {
        const right = nameOf(child(root, 'right'));
        if (!right) {
          return Term.unknown;
        }
        path.unshift(right);
        root = child(root, 'left');
      }
      const rootName = nameOf(root);
      const declared = rootName ? scopes.value(rootName, node) : undefined;
      if (declared?.declaration.kind !== 'import') {
        return Term.unknown;
      }
      const iri = boundaryIri(declared.declaration.binding, path);
      return iri ? Term.typeOf(iri) : Term.unknown;
    }
    return Term.unknown;
  };

  //
  // Values.
  //

  /** The type of whatever a value declaration binds. */
  const valueOf = (declaration: ValueDeclaration, scope: Node, name: string): Term.Type => {
    switch (declaration.kind) {
      case 'variable':
        return variableType(declaration.declarator, declaration.mode, declaration.path);
      case 'param':
        return paramBindingType(declaration.param, declaration.path);
      case 'function':
        return functionType(declaration.node);
      case 'class':
        return isTopLevel(scope) && declaration.node.type === 'ClassDeclaration'
          ? Term.typeOf(localIri(name))
          : Term.unknown;
      case 'import': {
        const iri = boundaryIri(declaration.binding, []);
        if (!iri) {
          return Term.unknown;
        }
        return MODELS.values.get(iri)?.value ?? Term.typeOf(iri);
      }
      default:
        return Term.unknown;
    }
  };

  const variableType = (declarator: Node, mode: string, path: readonly PatternStep[]): Term.Type => {
    const id = child(declarator, 'id');
    const annotation = annotationOf(id);
    const init = child(declarator, 'init');
    if (mode === 'using' || mode === 'await using') {
      return Term.unknown;
    }
    let root: Term.Type;
    if (annotation) {
      root = typeFromSyntax(annotation);
    } else if (init) {
      root = expression(init);
    } else {
      const parent = scopes.parent(declarator);
      const loop = parent ? scopes.parent(parent) : undefined;
      if (loop?.type === 'ForOfStatement' && child(loop, 'left') === parent && loop.await !== true) {
        const iterable = child(loop, 'right');
        root = iterable ? elementOf(expression(iterable)) : Term.unknown;
      } else if (loop?.type === 'ForInStatement' && child(loop, 'left') === parent) {
        root = Term.string;
      } else {
        return Term.unknown;
      }
    }
    const bound = followPattern(root, path);
    // `let`/`var` widen fresh literals; `const` keeps them, still fresh, so they widen downstream.
    return mode === 'const' ? bound : Term.widen(bound);
  };

  const elementOf = (iterable: Term.Type): Term.Type => {
    if (
      iterable.kind === 'ref' &&
      (iterable.iri === Term.libIri('Array') || iterable.iri === Term.libIri('ReadonlyArray'))
    ) {
      return iterable.args[0] ?? Term.unknown;
    }
    if (iterable.kind === 'tuple' && iterable.elements.every((element) => !element.optional && !element.rest)) {
      return Term.union(iterable.elements.map((element) => element.type));
    }
    return isStringLike(iterable) ? Term.string : Term.unknown;
  };

  /** Descend a destructuring path; defaults and rest elements are not modeled. */
  const followPattern = (root: Term.Type, path: readonly PatternStep[]): Term.Type => {
    let current = root;
    for (const step of path) {
      if (current.kind === 'unknown') {
        return current;
      }
      switch (step.kind) {
        case 'property': {
          if (current.kind !== 'object') {
            return Term.unknown;
          }
          const property = current.properties.find((candidate) => candidate.name === step.name);
          if (!property) {
            return Term.unknown;
          }
          current = property.optional ? Term.union([property.type, Term.undefined_]) : property.type;
          break;
        }
        case 'element': {
          if (current.kind === 'tuple') {
            const element = current.elements[step.index];
            if (!element || element.rest || current.elements.some((candidate) => candidate.rest)) {
              return Term.unknown;
            }
            current = element.optional ? Term.union([element.type, Term.undefined_]) : element.type;
          } else if (
            current.kind === 'ref' &&
            (current.iri === Term.libIri('Array') || current.iri === Term.libIri('ReadonlyArray'))
          ) {
            current = current.args[0] ?? Term.unknown;
          } else {
            return Term.unknown;
          }
          break;
        }
        default:
          return Term.unknown;
      }
    }
    return current;
  };

  const paramBindingType = (param: Node, path: readonly PatternStep[]): Term.Type => {
    if (param.type === 'TSParameterProperty') {
      return Term.unknown;
    }
    if (param.type === 'AssignmentPattern') {
      const left = child(param, 'left');
      const right = child(param, 'right');
      const annotation = annotationOf(left);
      const root = annotation
        ? typeFromSyntax(annotation)
        : right && left?.type === 'Identifier'
          ? Term.widen(expression(right))
          : Term.unknown;
      // The first step is the default itself.
      return Term.widen(followPattern(root, path.slice(1)));
    }
    const annotation = annotationOf(param);
    if (!annotation) {
      return Term.unknown;
    }
    const root = typeFromSyntax(annotation);
    const declared = param.optional === true ? Term.union([root, Term.undefined_]) : root;
    // A rest parameter's first step is the rest marker: the binding is the array itself.
    return followPattern(declared, param.type === 'RestElement' ? path.slice(1) : path);
  };

  /**
   * A function's parameter list as `Term.Param`s. With `declaredOnly`, every parameter needs an
   * annotation (a type, not an implementation); otherwise a default value's widened type counts.
   * `undefined` for a `this` parameter or a destructured one without an annotation.
   */
  const parameters = (fn: Node, declaredOnly: boolean): Term.Param[] | undefined => {
    const result: Term.Param[] = [];
    for (const param of childList(fn, 'params')) {
      if (param.type === 'TSParameterProperty') {
        return undefined;
      }
      if (param.type === 'Identifier' && param.name === 'this') {
        return undefined;
      }
      if (param.type === 'AssignmentPattern') {
        if (declaredOnly) {
          return undefined;
        }
        const left = child(param, 'left');
        const right = child(param, 'right');
        const annotation = annotationOf(left);
        // A destructuring pattern's own shape contributes to the type; only an identifier takes the default's.
        const type = annotation
          ? typeFromSyntax(annotation)
          : right && left?.type === 'Identifier'
            ? Term.widen(expression(right))
            : Term.unknown;
        result.push({ type: Term.without(type, ['undefined']), optional: true, rest: false });
        continue;
      }
      const annotation = annotationOf(param);
      const type = annotation ? typeFromSyntax(annotation) : Term.unknown;
      if (!annotation && declaredOnly) {
        return undefined;
      }
      const optional = param.optional === true;
      result.push({
        type: optional ? Term.without(type, ['undefined']) : type,
        optional,
        rest: param.type === 'RestElement',
      });
    }
    return result;
  };

  /** Whether a function expression gets a contextual type from where it sits — then its unannotated parts are not ours to infer. */
  const isContextuallyTyped = (fn: Node): boolean => {
    let current = fn;
    let parent = scopes.parent(current);
    while (parent) {
      switch (parent.type) {
        case 'ParenthesizedExpression':
        case 'ConditionalExpression':
        case 'LogicalExpression':
        case 'ArrayExpression':
        case 'SequenceExpression':
          break;
        case 'Property': {
          const object = scopes.parent(parent);
          if (child(parent, 'value') !== current || !object) {
            return true;
          }
          current = parent;
          parent = object;
          continue;
        }
        case 'ObjectExpression':
          break;
        case 'VariableDeclarator':
          return child(parent, 'init') === current ? annotationOf(child(parent, 'id')) !== undefined : true;
        case 'ExportDefaultDeclaration':
        case 'ExpressionStatement':
          return false;
        case 'PropertyDefinition':
          return annotationOf(parent) !== undefined;
        case 'CallExpression':
          // An immediately invoked function is the callee, not an argument: nothing types it.
          return child(parent, 'callee') !== current;
        default:
          return true;
      }
      current = parent;
      parent = scopes.parent(current);
    }
    return false;
  };

  /** The type of a function node (declaration, expression, arrow). */
  const functionType = (fn: Node): Term.Type =>
    memo(declarationCache, fn, () => {
      if (fn.type === 'TSDeclareFunction') {
        return Term.unknown;
      }
      const typeParams = simpleTypeParams(fn);
      if (!typeParams || fn.generator === true) {
        return Term.unknown;
      }
      const contextual = fn.type !== 'FunctionDeclaration' && isContextuallyTyped(fn);
      const params = parameters(fn, false);
      if (!params) {
        return Term.unknown;
      }
      const annotated = returnAnnotation(fn);
      let returns: Term.Type;
      if (annotated) {
        returns = typeFromSyntax(annotated);
      } else if (contextual) {
        returns = Term.unknown;
      } else {
        returns = inferredReturn(fn);
      }
      return Term.fn(params, returns, typeParams);
    });

  /** Return statements of a function body, not of functions nested in it. */
  const returnsOf = (body: Node): { returns: Node[]; throws: boolean } => {
    const returns: Node[] = [];
    let throws = false;
    walk(body, [], (node) => {
      if (
        node !== body &&
        (isFunctionNode(node) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression')
      ) {
        return false;
      }
      if (node.type === 'ReturnStatement') {
        returns.push(node);
      } else if (
        node.type === 'ThrowStatement' ||
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'LabeledStatement'
      ) {
        // Reachability of the end point decides `void` vs `never`; loops and throws are not modeled.
        throws = true;
      }
      return undefined;
    });
    return { returns, throws };
  };

  const inferredReturn = (fn: Node): Term.Type => {
    const body = child(fn, 'body');
    if (!body) {
      return Term.unknown;
    }
    let returned: Term.Type;
    if (body.type !== 'BlockStatement') {
      returned = Term.widen(expression(body));
    } else {
      const { returns, throws } = returnsOf(body);
      if (returns.length === 0) {
        // A function expression whose end is unreachable returns `never`; a declaration `void`.
        if (fn.type !== 'FunctionDeclaration' && (throws || mayNotReturn(body))) {
          return Term.unknown;
        }
        returned = Term.void_;
      } else {
        const values = returns.map((statement) => child(statement, 'argument'));
        if (values.some((value) => value === undefined)) {
          // `return;` mixed with values, or bare: `void` and `undefined` interplay is not modeled.
          return values.every((value) => value === undefined) && !throws
            ? fn.async === true
              ? Term.promise(Term.void_)
              : Term.void_
            : Term.unknown;
        }
        const types = values.map((value) => (value ? Term.widen(expression(value)) : Term.unknown));
        // Falling off the end adds `undefined` (`tsc` reports it); that needs reachability.
        if (!endsInReturn(body)) {
          return Term.unknown;
        }
        returned = reducedUnion(fn.async === true ? types.map(awaited) : types);
      }
    }
    if (fn.async === true) {
      return Term.hasParams(returned)
        ? Term.unknown
        : Term.promise(body.type === 'BlockStatement' ? returned : awaited(returned));
    }
    return returned;
  };

  /**
   * Whether a statement-level call could return `never` and so make the end unreachable: any call
   * whose callee is not a function we typed with another return type.
   */
  const mayNotReturn = (body: Node): boolean => {
    let found = false;
    walk(body, [], (node) => {
      if (
        found ||
        (node !== body && (isFunctionNode(node) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression'))
      ) {
        return false;
      }
      if (node.type === 'ExpressionStatement') {
        const statement = child(node, 'expression');
        const call = statement?.type === 'AwaitExpression' ? child(statement, 'argument') : statement;
        const callee = call?.type === 'CallExpression' ? child(call, 'callee') : undefined;
        if (callee) {
          const type = expression(callee);
          found = !(
            type.kind === 'function' &&
            type.returns.kind !== 'unknown' &&
            !(type.returns.kind === 'primitive' && type.returns.name === 'never')
          );
        }
      }
      return undefined;
    });
    return found;
  };

  /** Whether a block's last statement is a `return` — the cheap proof that the end is unreachable. */
  const endsInReturn = (block: Node): boolean => {
    const last = childList(block, 'body').at(-1);
    return last?.type === 'ReturnStatement';
  };

  const awaited = (type: Term.Type): Term.Type => {
    if (type.kind === 'ref' && type.iri === Term.libIri('Promise')) {
      // `Awaited<T>` stays unevaluated over a type parameter.
      const value = type.args[0];
      return value && !Term.hasParams(value) ? awaited(value) : Term.unknown;
    }
    if (type.kind === 'union') {
      return Term.union(type.members.map(awaited));
    }
    return isPrimitiveLike(type) ||
      type.kind === 'tuple' ||
      (type.kind === 'object' && !type.properties.some((property) => property.name === 'then'))
      ? type
      : Term.unknown;
  };

  const binding = (identifier: Node): Term.Type => {
    const name = nameOf(identifier);
    const declared = name ? scopes.value(name, identifier) : undefined;
    return declared ? valueOf(declared.declaration, declared.scope, name ?? '') : Term.unknown;
  };

  //
  // Control flow. `tsc` types a reference by its narrowed flow type; the propagator does no flow
  // analysis, so a reference is typed by its declaration only when no narrowing can apply.
  //

  let narrowable: Set<ValueDeclaration> | undefined;

  /** Declarations with any reference in a guard position — computed once per file. */
  const narrowableDeclarations = (): Set<ValueDeclaration> => {
    if (narrowable) {
      return narrowable;
    }
    const found = new Set<ValueDeclaration>();
    for (const node of scopes.guarded) {
      const name = nameOf(node);
      const declared = name ? scopes.value(name, node) : undefined;
      if (declared) {
        found.add(declared.declaration);
      }
    }
    narrowable = found;
    return found;
  };

  /** A type whose declared form an initializer could narrow (`let x: A | B = a` reads as `A`). */
  const mayBeUnion = (type: Term.Type): boolean => {
    switch (type.kind) {
      case 'union':
      case 'unknown':
        return true;
      case 'primitive':
        return type.name === 'unknown' || type.name === 'any';
      case 'ref':
        // Local interfaces and classes, library types we model, and globals are never unions; an
        // imported or aliased name might be.
        return !(
          type.iri.startsWith(Term.LIB_BASE) ||
          MODELS.types.has(type.iri) ||
          localDeclarationKind(type.iri) === 'interface' ||
          localDeclarationKind(type.iri) === 'class'
        );
      default:
        return false;
    }
  };

  const localDeclarationKind = (iri: string): string | undefined => {
    if (!iri.startsWith(localIri(''))) {
      return undefined;
    }
    const declared = scopes.type(decodeURIComponent(iri.slice(localIri('').length)), scopes.program);
    return declared && isTopLevel(declared.scope) ? declared.declaration.kind : undefined;
  };

  /** Whether a reference to this declaration could read as something other than its declared type. */
  const isFlowSensitive = (declaration: ValueDeclaration): boolean => {
    if (declaration.kind !== 'variable' && declaration.kind !== 'param') {
      return false;
    }
    if (narrowableDeclarations().has(declaration)) {
      return true;
    }
    if (declaration.kind === 'variable') {
      const annotated = annotationOf(child(declaration.declarator, 'id'));
      return (
        annotated !== undefined &&
        child(declaration.declarator, 'init') !== undefined &&
        mayBeUnion(typeFromSyntax(annotated))
      );
    }
    const param = declaration.param;
    return param.type === 'AssignmentPattern' && annotationOf(child(param, 'left')) !== undefined;
  };

  //
  // Expressions.
  //

  const expression = (node: Node): Term.Type => memo(expressionCache, node, () => evaluate(node, false));

  const constExpression = (node: Node): Term.Type => evaluate(node, true);

  /** Resolve `a.b.c` rooted at an import binding to the member IRI, if that is what it is. */
  const importChain = (node: Node): string | undefined => {
    const path: string[] = [];
    let current = stripParens(node);
    while (current.type === 'MemberExpression' && current.computed !== true) {
      const property = nameOf(child(current, 'property'));
      const object = child(current, 'object');
      if (!property || !object || current.optional === true) {
        return undefined;
      }
      path.unshift(property);
      current = stripParens(object);
    }
    const root = nameOf(current);
    if (!root || current.type !== 'Identifier') {
      return undefined;
    }
    const declared = scopes.value(root, current);
    return declared?.declaration.kind === 'import' ? boundaryIri(declared.declaration.binding, path) : undefined;
  };

  const modelContext: ModelContext = {
    expression: (node) => expression(node),
    constExpression: (node) => Term.settle(constExpression(node)),
    returned: (node) => {
      const fn = stripParens(node);
      return isFunctionNode(fn) && fn.generator !== true && fn.async !== true ? inferredReturn(fn) : Term.unknown;
    },
    callee: (node) => importChain(node),
    serviceKey: (node) => serviceKey(node),
    generator: (node) => generatorSummary(node),
  };

  const evaluate = (node: Node, constContext: boolean): Term.Type => {
    switch (node.type) {
      case 'ParenthesizedExpression': {
        const inner = child(node, 'expression');
        return inner ? (constContext ? constExpression(inner) : expression(inner)) : Term.unknown;
      }
      case 'Literal': {
        if (node.value === null && node.raw === 'null') {
          return Term.null_;
        }
        if (typeof node.regex === 'object' && node.regex !== null) {
          return Term.lib('RegExp');
        }
        if (typeof node.bigint === 'string') {
          return Term.literal(BigInt(node.bigint), !constContext);
        }
        return typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean'
          ? Term.literal(node.value, !constContext)
          : Term.unknown;
      }
      case 'TemplateLiteral': {
        // With substitutions `tsc` may fold literal operands into a literal type; not modeled.
        if (childList(node, 'expressions').length > 0) {
          return Term.unknown;
        }
        const cooked = templateText(node);
        return cooked === undefined ? Term.unknown : Term.literal(cooked, !constContext);
      }
      case 'Identifier': {
        const name = nameOf(node);
        if (!name) {
          return Term.unknown;
        }
        const declared = scopes.value(name, node);
        if (!declared) {
          return name === 'undefined'
            ? Term.undefined_
            : name === 'NaN' || name === 'Infinity'
              ? Term.number
              : Term.unknown;
        }
        return isFlowSensitive(declared.declaration)
          ? Term.unknown
          : valueOf(declared.declaration, declared.scope, name);
      }
      case 'ObjectExpression':
        return objectLiteral(node, constContext);
      case 'ArrayExpression':
        return arrayLiteral(node, constContext);
      case 'TSAsExpression':
      case 'TSTypeAssertion': {
        const inner = child(node, 'expression');
        if (isConstAssertion(node)) {
          return inner ? constExpression(inner) : Term.unknown;
        }
        const annotation = child(node, 'typeAnnotation');
        return annotation ? typeFromSyntax(annotation) : Term.unknown;
      }
      case 'TSNonNullExpression': {
        const inner = child(node, 'expression');
        return inner ? Term.without(expression(inner), ['null', 'undefined']) : Term.unknown;
      }
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return functionType(node);
      case 'CallExpression':
        return call(node);
      case 'NewExpression':
        return construct(node);
      case 'MemberExpression':
        return member(node);
      case 'AwaitExpression': {
        const argument = child(node, 'argument');
        return argument ? awaited(Term.settle(expression(argument))) : Term.unknown;
      }
      case 'UnaryExpression':
        return unary(node);
      case 'BinaryExpression':
        return binary(node);
      case 'LogicalExpression': {
        const left = child(node, 'left');
        const right = child(node, 'right');
        if (node.operator !== '??' || !left || !right) {
          return Term.unknown;
        }
        return reducedUnion([Term.without(expression(left), ['null', 'undefined']), expression(right)]);
      }
      case 'ConditionalExpression': {
        const consequent = child(node, 'consequent');
        const alternate = child(node, 'alternate');
        if (!consequent || !alternate) {
          return Term.unknown;
        }
        const evaluateBranch = constContext ? constExpression : expression;
        return reducedUnion([evaluateBranch(consequent), evaluateBranch(alternate)]);
      }
      case 'YieldExpression':
        return yieldOf(node);
      case 'SequenceExpression': {
        const last = childList(node, 'expressions').at(-1);
        return last ? expression(last) : Term.unknown;
      }
      default:
        return Term.unknown;
    }
  };

  const objectLiteral = (node: Node, constContext: boolean): Term.Type => {
    const properties: Term.Property[] = [];
    const seen = new Set<string>();
    for (const property of childList(node, 'properties')) {
      if (property.type !== 'Property' || property.kind !== 'init') {
        return Term.unknown;
      }
      const name = propertyKey(property);
      const value = child(property, 'value');
      if (name === undefined || !value || seen.has(name)) {
        return Term.unknown;
      }
      seen.add(name);
      let type: Term.Type;
      if (property.method === true) {
        type = functionType(value);
      } else {
        type = constContext ? Term.settle(constExpression(value)) : Term.widen(expression(value));
      }
      properties.push({ name, type, optional: false, readonly: constContext });
    }
    return Term.object(properties);
  };

  const arrayLiteral = (node: Node, constContext: boolean): Term.Type => {
    const elements = Array.isArray(node.elements) ? node.elements : [];
    if (elements.length === 0 || elements.some((element) => !isNode(element) || element.type === 'SpreadElement')) {
      return Term.unknown;
    }
    const nodes = elements.filter(isNode);
    if (constContext) {
      return Term.tuple(
        nodes.map((element) => ({ type: Term.settle(constExpression(element)), optional: false, rest: false })),
        true,
      );
    }
    const element = reducedUnion(nodes.map((entry) => Term.widen(expression(entry))));
    return element.kind === 'unknown' ? Term.unknown : Term.array(element);
  };

  const unary = (node: Node): Term.Type => {
    const argument = child(node, 'argument');
    if (!argument) {
      return Term.unknown;
    }
    switch (node.operator) {
      case '!':
      case 'delete':
        return Term.boolean;
      case 'void':
        return Term.undefined_;
      case 'typeof':
        return TYPEOF_RESULT;
      case '-': {
        if (argument.type === 'Literal' && typeof argument.value === 'number') {
          return Term.literal(-argument.value, true);
        }
        if (argument.type === 'Literal' && typeof argument.bigint === 'string') {
          return Term.literal(-BigInt(argument.bigint), true);
        }
        const operand = expression(argument);
        return isNumberLike(operand) ? Term.number : isBigIntLike(operand) ? Term.bigint : Term.unknown;
      }
      case '+':
        return Term.number;
      case '~': {
        const operand = expression(argument);
        return isNumberLike(operand) ? Term.number : isBigIntLike(operand) ? Term.bigint : Term.unknown;
      }
      default:
        return Term.unknown;
    }
  };

  const binary = (node: Node): Term.Type => {
    const leftNode = child(node, 'left');
    const rightNode = child(node, 'right');
    if (!leftNode || !rightNode) {
      return Term.unknown;
    }
    const operator = String(node.operator);
    if (['==', '!=', '===', '!==', '<', '>', '<=', '>=', 'instanceof', 'in'].includes(operator)) {
      return Term.boolean;
    }
    const left = expression(leftNode);
    const right = expression(rightNode);
    if (operator === '+') {
      if (isStringLike(left) || isStringLike(right)) {
        return Term.string;
      }
    }
    if (['+', '-', '*', '/', '%', '**', '|', '&', '^', '<<', '>>', '>>>'].includes(operator)) {
      if (isNumberLike(left) && isNumberLike(right)) {
        return Term.number;
      }
      if (isBigIntLike(left) && isBigIntLike(right) && operator !== '>>>') {
        return Term.bigint;
      }
    }
    return Term.unknown;
  };

  const member = (node: Node): Term.Type => {
    if (node.optional === true) {
      return Term.unknown;
    }
    const iri = importChain(node);
    if (iri) {
      return MODELS.values.get(iri)?.value ?? Term.typeOf(iri);
    }
    const objectNode = child(node, 'object');
    if (!objectNode) {
      return Term.unknown;
    }
    let name: string | undefined;
    if (node.computed === true) {
      const property = child(node, 'property');
      name = property?.type === 'Literal' && typeof property.value === 'string' ? property.value : undefined;
    } else {
      name = nameOf(child(node, 'property'));
    }
    if (name === undefined) {
      return Term.unknown;
    }
    return propertyOf(Term.settle(expression(objectNode)), name);
  };

  /** The members of a local, non-generic interface without heritage, as an object type. */
  const localObject = (type: Term.Type): Term.Type | undefined => {
    if (type.kind !== 'ref' || type.args.length > 0 || !type.iri.startsWith(localIri(''))) {
      return undefined;
    }
    const name = decodeURIComponent(type.iri.slice(localIri('').length));
    const declared = scopes.type(name, scopes.program);
    if (!declared || !isTopLevel(declared.scope)) {
      return undefined;
    }
    const { declaration } = declared;
    if (
      declaration.kind === 'interface' &&
      childList(declaration.node, 'extends').length === 0 &&
      !child(declaration.node, 'typeParameters')
    ) {
      const body = child(declaration.node, 'body');
      const members = body ? objectType(childList(body, 'body')) : Term.unknown;
      return members.kind === 'object' ? members : undefined;
    }
    if (declaration.kind === 'alias' && !child(declaration.node, 'typeParameters')) {
      const target = annotationOf(declaration.node);
      const members = target?.type === 'TSTypeLiteral' ? typeFromSyntax(target) : Term.unknown;
      return members.kind === 'object' ? members : undefined;
    }
    return undefined;
  };

  const propertyOf = (named: Term.Type, name: string): Term.Type => {
    const object = localObject(named) ?? named;
    if (object.kind === 'object') {
      const property = object.properties.find((candidate) => candidate.name === name);
      return property
        ? property.optional
          ? Term.union([property.type, Term.undefined_])
          : property.type
        : Term.unknown;
    }
    if (name === 'length') {
      if (object.kind === 'tuple') {
        return object.elements.every((element) => !element.optional && !element.rest)
          ? Term.literal(object.elements.length)
          : Term.unknown;
      }
      if (isStringLike(object) || isArrayLike(object)) {
        return Term.number;
      }
    }
    return Term.unknown;
  };

  //
  // Calls.
  //

  const argumentsOf = (node: Node): Node[] | undefined => {
    const args = childList(node, 'arguments');
    return args.some((arg) => arg.type === 'SpreadElement') ? undefined : args;
  };

  const call = (node: Node): Term.Type => {
    if (node.optional === true) {
      return Term.unknown;
    }
    const callee = child(node, 'callee');
    const args = argumentsOf(node);
    if (!callee || !args) {
      return Term.unknown;
    }
    const target = stripParens(callee);
    // `x.pipe(f, g)` applies each stage to the value in turn.
    if (
      target.type === 'MemberExpression' &&
      target.computed !== true &&
      nameOf(child(target, 'property')) === 'pipe'
    ) {
      const object = child(target, 'object');
      if (object && !importChain(target)) {
        return pipe(expression(object), args);
      }
    }
    const iri = importChain(target);
    const model = iri ? MODELS.values.get(iri) : undefined;
    if (model?.call) {
      return model.call(args, node, modelContext);
    }
    return applyFunction(expression(target), args, typeArgumentsOf(node)?.map(typeFromSyntax));
  };

  const pipe = (self: Term.Type, stages: readonly Node[]): Term.Type => {
    let current = self;
    for (const stage of stages) {
      if (current.kind === 'unknown') {
        return current;
      }
      const target = stripParens(stage);
      if (target.type === 'CallExpression') {
        const callee = child(target, 'callee');
        const iri = callee ? importChain(callee) : undefined;
        const model: Model | undefined = iri ? MODELS.values.get(iri) : undefined;
        const args = argumentsOf(target);
        if (!model?.pipe || !args) {
          return Term.unknown;
        }
        current = model.pipe(args, current, modelContext);
      } else {
        current = applyTypes(expression(target), [current]);
      }
    }
    return current;
  };

  /** Call a function type with argument nodes. */
  const applyFunction = (callee: Term.Type, args: readonly Node[], explicit?: readonly Term.Type[]): Term.Type => {
    if (callee.kind !== 'function') {
      return Term.unknown;
    }
    if (explicit) {
      if (explicit.length !== callee.typeParams.length || args.length > callee.params.length) {
        return Term.unknown;
      }
      return Term.instantiate(callee.returns, new Map(callee.typeParams.map((name, index) => [name, explicit[index]])));
    }
    return applyTypes(
      callee,
      args.map((arg) =>
        callee.typeParams.length > 0 && isFunctionNode(stripParens(arg)) ? contextualArgument(arg) : expression(arg),
      ),
    );
  };

  /** A function argument to a generic call: only fully annotated functions are not re-typed by context. */
  const contextualArgument = (arg: Node): Term.Type => {
    const fn = stripParens(arg);
    const params = childList(fn, 'params');
    const annotated = params.every((param) => annotationOf(param) !== undefined) && returnAnnotation(fn) !== undefined;
    return annotated ? expression(arg) : Term.unknown;
  };

  /** Call a function type with argument types: arity check, then generic inference. */
  const applyTypes = (callee: Term.Type, args: readonly Term.Type[]): Term.Type => {
    if (callee.kind !== 'function') {
      return Term.unknown;
    }
    const required = callee.params.filter((entry) => !entry.optional && !entry.rest).length;
    const hasRest = callee.params.some((entry) => entry.rest);
    if (args.length < required || (!hasRest && args.length > callee.params.length) || hasRest) {
      return Term.unknown;
    }
    if (callee.typeParams.length === 0) {
      return callee.returns;
    }
    const candidates = new Map<string, Array<{ type: Term.Type; topLevel: boolean }>>();
    for (const [index, arg] of args.entries()) {
      if (!unify(callee.params[index].type, arg, callee.typeParams, candidates, true)) {
        return Term.unknown;
      }
    }
    const bindings = new Map<string, Term.Type>();
    for (const name of callee.typeParams) {
      const found = candidates.get(name) ?? [];
      if (found.length === 0) {
        bindings.set(name, Term.primitive('unknown'));
        continue;
      }
      const texts = new Set(found.map((candidate) => Term.text(Term.widen(candidate.type))));
      if (texts.size > 1 || found.some((candidate) => candidate.type.kind === 'unknown')) {
        return Term.unknown;
      }
      const exact = new Set(found.map((candidate) => Term.text(candidate.type)));
      const widen = found.every((candidate) => candidate.topLevel) && !isTypeParamAtTopLevel(callee.returns, name);
      if (exact.size > 1 && !widen) {
        return Term.unknown;
      }
      bindings.set(name, widen ? Term.widen(found[0].type) : found[0].type);
    }
    return Term.instantiate(callee.returns, bindings);
  };

  /** Structural matching of a parameter type against an argument type, collecting candidates. */
  const unify = (
    parameter: Term.Type,
    argument: Term.Type,
    typeParams: readonly string[],
    candidates: Map<string, Array<{ type: Term.Type; topLevel: boolean }>>,
    topLevel: boolean,
  ): boolean => {
    if (!typeParams.some((name) => Term.mentions(parameter, name))) {
      return true;
    }
    if (parameter.kind === 'param' && typeParams.includes(parameter.name)) {
      const list = candidates.get(parameter.name) ?? [];
      list.push({ type: argument, topLevel });
      candidates.set(parameter.name, list);
      return true;
    }
    if (
      parameter.kind === 'ref' &&
      argument.kind === 'ref' &&
      parameter.iri === argument.iri &&
      parameter.args.length === argument.args.length
    ) {
      return parameter.args.every((arg, index) => unify(arg, argument.args[index], typeParams, candidates, false));
    }
    if (parameter.kind === 'object' && argument.kind === 'object') {
      return parameter.properties.every((property) => {
        const match = argument.properties.find((candidate) => candidate.name === property.name);
        return (
          match !== undefined && !property.optional && unify(property.type, match.type, typeParams, candidates, false)
        );
      });
    }
    if (
      parameter.kind === 'function' &&
      argument.kind === 'function' &&
      parameter.typeParams.length === 0 &&
      argument.typeParams.length === 0
    ) {
      return (
        parameter.params.length === argument.params.length &&
        !Term.isPartial(argument) &&
        unify(parameter.returns, argument.returns, typeParams, candidates, false)
      );
    }
    return false;
  };

  const construct = (node: Node): Term.Type => {
    const callee = child(node, 'callee');
    const args = argumentsOf(node);
    const name = callee ? nameOf(callee) : undefined;
    if (!callee || !name || !args) {
      return Term.unknown;
    }
    const explicit = typeArgumentsOf(node)?.map(typeFromSyntax);
    const declared = scopes.value(name, callee);
    if (!declared) {
      if (!LIB_CONSTRUCTORS.has(name)) {
        return Term.unknown;
      }
      const known = LIB_TYPES[name];
      return explicit?.length === known.arity || known.arity === 0 ? Term.lib(name, explicit ?? []) : Term.unknown;
    }
    if (
      declared.declaration.kind !== 'class' ||
      !isTopLevel(declared.scope) ||
      declared.declaration.node.type !== 'ClassDeclaration'
    ) {
      return Term.unknown;
    }
    const typeParams = simpleTypeParams(declared.declaration.node);
    if (!typeParams) {
      return Term.unknown;
    }
    if (typeParams.length === 0) {
      return explicit ? Term.unknown : Term.ref(localIri(name));
    }
    return explicit?.length === typeParams.length ? Term.ref(localIri(name), explicit) : Term.unknown;
  };

  /** Whether `fn` is the generator passed to `Effect.gen` — decided from the call, so it does not depend on evaluation order. */
  const isGeneratorArgument = (fn: Node): boolean => {
    let current = fn;
    let parent = scopes.parent(current);
    while (parent?.type === 'ParenthesizedExpression') {
      current = parent;
      parent = scopes.parent(current);
    }
    if (fn.generator !== true || parent?.type !== 'CallExpression' || child(parent, 'callee') === current) {
      return false;
    }
    const callee = child(parent, 'callee');
    const args = childList(parent, 'arguments');
    return callee !== undefined && importChain(callee) === MODELS.genIri && args.length === 1 && args[0] === current;
  };

  /**
   * `yield* x` inside a generator a model consumes (`Effect.gen`): the success value of the effect,
   * or the shape of a service class.
   */
  const yieldOf = (node: Node): Term.Type => {
    const argument = child(node, 'argument');
    if (node.delegate !== true || !argument) {
      return Term.unknown;
    }
    let fn = scopes.parent(node);
    while (fn && !isFunctionNode(fn)) {
      fn = scopes.parent(fn);
    }
    if (!fn || !isGeneratorArgument(fn)) {
      return Term.unknown;
    }
    const key = serviceKey(argument);
    if (key) {
      return key[1];
    }
    const yielded = expression(argument);
    return yielded.kind === 'ref' && yielded.iri === MODELS.effectIri && yielded.args.length === 3
      ? yielded.args[0]
      : Term.unknown;
  };

  //
  // Model support.
  //

  /**
   * `class S extends Context.Service<Self, Shape>()('id')`, referenced by `node`: the `[Self, Shape]`
   * a `Context.Key` view of `S` has. Only for a class declared in this file.
   */
  const serviceKey = (node: Node): readonly [Term.Type, Term.Type] | undefined => {
    const target = stripParens(node);
    const name = nameOf(target);
    const declared = name ? scopes.value(name, target) : undefined;
    if (declared?.declaration.kind !== 'class' || !isTopLevel(declared.scope)) {
      return undefined;
    }
    const heritage = child(declared.declaration.node, 'superClass');
    // `Context.Service<Self, Shape>()('id')`: the outer call's callee is the inner call.
    const inner = heritage?.type === 'CallExpression' ? child(heritage, 'callee') : undefined;
    const service = inner?.type === 'CallExpression' ? child(inner, 'callee') : undefined;
    if (!inner || !service || importChain(service) !== MODELS.serviceIri) {
      return undefined;
    }
    const args = typeArgumentsOf(inner)?.map(typeFromSyntax);
    if (args?.length !== 2) {
      return undefined;
    }
    // The class must name itself as `Self`, which is what makes `Self` its instance type.
    const self = args[0];
    if (self.kind !== 'ref' || self.iri !== localIri(name ?? '') || self.args.length > 0) {
      return undefined;
    }
    return [self, args[1]];
  };

  /** The `yield*` operands and `return` values of a generator function, typed; `undefined` if any is unknown or unsupported. */
  const generatorSummary = (node: Node): GeneratorSummary | undefined => {
    const fn = stripParens(node);
    if (fn.generator !== true || childList(fn, 'params').length > 0 || fn.async === true) {
      return undefined;
    }
    const body = child(fn, 'body');
    if (!body) {
      return undefined;
    }
    const yields: Node[] = [];
    let plainYield = false;
    walk(body, [], (inner) => {
      if (
        inner !== body &&
        (isFunctionNode(inner) || inner.type === 'ClassDeclaration' || inner.type === 'ClassExpression')
      ) {
        return false;
      }
      if (inner.type === 'YieldExpression') {
        const argument = child(inner, 'argument');
        if (inner.delegate !== true || !argument) {
          plainYield = true;
        } else {
          yields.push(argument);
        }
      }
      return undefined;
    });
    if (plainYield) {
      return undefined;
    }
    const { returns, throws } = returnsOf(body);
    const values = returns.map((statement) => child(statement, 'argument'));
    let returned: Term.Type;
    if (returns.length === 0) {
      returned = throws ? Term.unknown : Term.void_;
    } else if (values.some((value) => value === undefined) || !endsInReturn(body)) {
      returned = Term.unknown;
    } else {
      returned = reducedUnion(values.map((value) => (value ? Term.widen(expression(value)) : Term.unknown)));
    }
    return { yields, returned };
  };

  //
  // Declarations.
  //

  const declaration = (node: Node): Term.Type =>
    memo(declarationCache, node, () => {
      switch (node.type) {
        case 'VariableDeclarator': {
          const id = child(node, 'id');
          return id?.type === 'Identifier' ? binding(id) : Term.unknown;
        }
        case 'FunctionDeclaration':
          return binding(child(node, 'id') ?? node);
        case 'PropertyDefinition': {
          const annotation = annotationOf(node);
          if (annotation) {
            return typeFromSyntax(annotation);
          }
          const value = child(node, 'value');
          if (!value) {
            return Term.unknown;
          }
          const type = expression(value);
          return node.readonly === true ? type : Term.widen(type);
        }
        default:
          // `export default <expression>`: the exported value's type, as a declaration would hold it.
          return node.type.endsWith('Expression') || node.type === 'Identifier'
            ? Term.settle(expression(node))
            : Term.unknown;
      }
    });

  return {
    declaration,
    binding,
    expression,
    scopes,
  };
};
