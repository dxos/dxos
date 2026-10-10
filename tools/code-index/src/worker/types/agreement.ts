//
// Copyright 2026 DXOS.org
//

import * as ts from '@typescript/typescript6';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import * as Ontology from '../../Ontology.ts';
import { type Node, child, walk } from '../analyzers/ast.ts';
import { type AnalyzeContext, type Resolve } from '../analyzers/common.ts';
import { analyzeTypeScript, inferFile, isTypeScriptPath } from '../analyzers/typescript.ts';
import { binder, envFromDocuments, hasDeferred } from './Bind.ts';
import { type ImportBinding, boundaryIri } from './Boundary.ts';
import * as Term from './Term.ts';

/**
 * The agreement harness (`design/TYPES.md`): runs the propagator and `tsc`'s checker over the same
 * files and scores each variable and function declaration. `tsc` types are converted into the same
 * term language, naming symbols through the file's own imports, so a comparison is term against
 * term — with named types (aliases, `typeof`, defaulted arguments) expanded through the checker
 * when the two sides spell the same type differently.
 */

export type Verdict = 'agree' | 'partial' | 'unresolved' | 'deferred' | 'disagree' | 'skipped';

export type Finding = {
  readonly path: string;
  readonly line: number;
  readonly name: string;
  readonly topLevel: boolean;
  readonly verdict: Verdict;
  readonly mine: string;
  readonly theirs: string;
};

export type Score = Record<Verdict, number>;

export type Result = {
  readonly score: Score;
  readonly findings: Finding[];
  /** Declarations the cross-file pass changed. */
  readonly bound: number;
  /** `unresolved` reasons over every scored term, most frequent first. */
  readonly reasons: ReadonlyArray<readonly [string, number]>;
};

export const emptyScore = (): Score => ({
  agree: 0,
  partial: 0,
  unresolved: 0,
  deferred: 0,
  disagree: 0,
  skipped: 0,
});

/** Every `unresolved` reason in a term — the buckets an analyzer improvement moves. */
const reasonsOf = (type: Term.Type, into: Map<string, number>): void => {
  const visit = (inner: Term.Type): void => {
    switch (inner.kind) {
      case 'unresolved':
        into.set(inner.reason, (into.get(inner.reason) ?? 0) + 1);
        return;
      case 'returnOf':
        visit(inner.callee);
        inner.args.forEach(visit);
        return;
      case 'ref':
        inner.args.forEach(visit);
        return;
      case 'union':
      case 'intersection':
        inner.members.forEach(visit);
        return;
      case 'object':
        inner.properties.forEach((property) => visit(property.type));
        return;
      case 'tuple':
        inner.elements.forEach((element) => visit(element.type));
        return;
      case 'function':
        inner.params.forEach((entry) => visit(entry.type));
        visit(inner.returns);
        return;
      default:
        return;
    }
  };
  visit(type);
};

/** The compiler options the repo builds with (`tsconfig.base.json`), plus source-condition resolution. */
export const compilerOptions = (root: string): ts.CompilerOptions => ({
  strict: true,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.Preserve,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  customConditions: ['source'],
  allowImportingTsExtensions: true,
  resolveJsonModule: true,
  experimentalDecorators: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  jsx: ts.JsxEmit.ReactJSX,
  lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
  types: ['node'],
  typeRoots: [join(root, 'node_modules/@types')],
});

// A nested `any` from `tsc` (an import it could not resolve) makes the position unverifiable.
const VERDICT_ORDER: readonly Verdict[] = ['agree', 'partial', 'skipped', 'disagree'];

const worst = (left: Verdict, right: Verdict): Verdict =>
  VERDICT_ORDER.indexOf(left) >= VERDICT_ORDER.indexOf(right) ? left : right;

/** The pseudo-term the converter returns for a `tsc` type outside the term language. */
const INEXPRESSIBLE = Symbol('inexpressible');

type Converted = Term.Type | typeof INEXPRESSIBLE;

const isTransientReadonly = (symbol: ts.Symbol): boolean => {
  // `CheckFlags.Readonly` on a synthesized property (`as const`, mapped types) — the checker's own
  // record; not part of the public API, so read defensively.
  const links: unknown = 'links' in symbol ? symbol.links : undefined;
  if (typeof links === 'object' && links !== null && 'checkFlags' in links && typeof links.checkFlags === 'number') {
    return (links.checkFlags & 8) !== 0;
  }
  return false;
};

const objectFlagsOf = (type: ts.Type): number =>
  'objectFlags' in type && typeof type.objectFlags === 'number' ? type.objectFlags : 0;

const isTypeReference = (type: ts.Type): type is ts.TypeReference =>
  (objectFlagsOf(type) & ts.ObjectFlags.Reference) !== 0 && 'target' in type;

const isTupleTarget = (type: ts.GenericType): type is ts.TupleType => 'elementFlags' in type;

const typeParametersOf = (type: ts.Type): readonly ts.TypeParameter[] =>
  'typeParameters' in type && Array.isArray(type.typeParameters) ? type.typeParameters : [];

const isReadonlyProperty = (symbol: ts.Symbol): boolean =>
  isTransientReadonly(symbol) ||
  (symbol.declarations ?? []).some(
    (declaration) => (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Readonly) !== 0,
  );

/**
 * Every IRI any program file uses for a symbol: two files can name one declaration differently
 * (`file:keys/src/EID.ts#EID` and `module:@dxos/keys#EID.EID`), and a bound term carries the
 * declaring file's spelling into the importing file's comparison.
 */
class Registry {
  readonly names = new Map<ts.Symbol, string[]>();
  readonly symbols = new Map<string, ts.Symbol>();

  add(symbol: ts.Symbol, iri: string): void {
    const names = this.names.get(symbol) ?? [];
    if (!names.includes(iri)) {
      names.push(iri);
    }
    this.names.set(symbol, names);
    if (!this.symbols.has(iri)) {
      this.symbols.set(iri, symbol);
    }
  }
}

/** Everything the comparison needs to know about one file on the `tsc` side. */
class TscFile {
  readonly #checker: ts.TypeChecker;
  readonly #program: ts.Program;
  /** This file's own routes first: the name its source would write. */
  readonly #names = new Map<ts.Symbol, string[]>();
  readonly #registry: Registry;
  /** Type syntax by span, so a named type the propagator read from source is checked against `tsc`'s reading of the same node. */
  readonly #typeNodes = new Map<string, ts.TypeReferenceNode>();
  readonly #bindings: ReadonlyMap<string, ImportBinding>;
  readonly #source: ts.SourceFile;

  constructor(
    program: ts.Program,
    source: ts.SourceFile,
    path: string,
    bindings: ReadonlyMap<string, ImportBinding>,
    registry: Registry,
  ) {
    this.#registry = registry;
    this.#program = program;
    this.#bindings = bindings;
    this.#source = source;
    this.#checker = program.getTypeChecker();
    const checker = this.#checker;
    const name = (symbol: ts.Symbol, iri: string) => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const names = this.#names.get(target) ?? [];
      if (!names.includes(iri)) {
        names.push(iri);
      }
      this.#names.set(target, names);
      registry.add(target, iri);
      return target;
    };
    // Local top-level declarations first: a local name wins over any route through an import.
    for (const statement of source.statements) {
      const declared: ts.BindingName[] = ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.map((declaration) => declaration.name)
        : (ts.isFunctionDeclaration(statement) ||
              ts.isClassDeclaration(statement) ||
              ts.isInterfaceDeclaration(statement) ||
              ts.isTypeAliasDeclaration(statement) ||
              ts.isEnumDeclaration(statement)) &&
            statement.name
          ? [statement.name]
          : [];
      for (const identifier of declared) {
        const symbol = ts.isIdentifier(identifier) ? checker.getSymbolAtLocation(identifier) : undefined;
        if (symbol && ts.isIdentifier(identifier)) {
          name(symbol, Ontology.symbolIri(path, identifier.text).value);
        }
      }
    }
    // Then every route through the file's imports, two namespace levels deep (`Effect.Effect`,
    // `Type.Obj` under a barrel).
    const exportsOf = (module: ts.Symbol, binding: ImportBinding, prefix: readonly string[], depth: number) => {
      for (const exported of checker.getExportsOfModule(module)) {
        const memberPath = [...prefix, exported.name];
        const iri = boundaryIri(binding, memberPath);
        if (!iri) {
          continue;
        }
        const target = name(exported, iri);
        if (depth > 0 && target.flags & ts.SymbolFlags.Module) {
          exportsOf(target, binding, memberPath, depth - 1);
        }
      }
    };
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) {
        continue;
      }
      const clause = statement.importClause;
      const locals = [
        ...(clause.name ? [clause.name] : []),
        ...(clause.namedBindings && ts.isNamespaceImport(clause.namedBindings) ? [clause.namedBindings.name] : []),
        ...(clause.namedBindings && ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements.map((element) => element.name)
          : []),
      ];
      for (const local of locals) {
        const binding = bindings.get(local.text);
        const symbol = checker.getSymbolAtLocation(local);
        if (!binding || !symbol) {
          continue;
        }
        const target = checker.getAliasedSymbol(symbol);
        const iri = boundaryIri(binding, []);
        if (iri) {
          name(symbol, iri);
        }
        if (target.flags & ts.SymbolFlags.Module) {
          exportsOf(target, binding, [], binding.imported === '*' ? 1 : 0);
        }
      }
    }
    const collect = (node: ts.Node) => {
      if (ts.isTypeReferenceNode(node)) {
        this.#typeNodes.set(`${node.getStart(source)}:${node.end}`, node);
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
  }

  /** Whether two IRIs are routes to one symbol (`React.FC` and `FC` from `react`). */
  equivalent(left: string, right: string): boolean {
    const symbol = this.#registry.symbols.get(left);
    return left === right || (symbol !== undefined && this.#registry.symbols.get(right) === symbol);
  }

  /**
   * `tsc`'s own reading of the type syntax a ref came from, provided `tsc` binds the name to a symbol
   * the ref's IRI is a route to; `undefined` when the name does not check out.
   */
  syntaxType(ref: Term.Type): { readonly type: Converted; readonly args: readonly Converted[] } | undefined {
    if (ref.kind !== 'ref' || !ref.origin) {
      return undefined;
    }
    const node = this.#typeNodes.get(`${ref.origin.start}:${ref.origin.end}`);
    if (!node) {
      return undefined;
    }
    if (!this.#bindsTo(node.typeName, ref.iri)) {
      return undefined;
    }
    const args = (node.typeArguments ?? []).map((arg) => this.convert(this.#checker.getTypeFromTypeNode(arg)));
    return { type: this.convert(this.#checker.getTypeFromTypeNode(node)), args };
  }

  get checker() {
    return this.#checker;
  }

  nameOf(symbol: ts.Symbol | undefined): string | undefined {
    if (!symbol) {
      return undefined;
    }
    const known = this.#names.get(symbol)?.[0];
    if (known) {
      return known;
    }
    const declarations = symbol.declarations ?? [];
    if (declarations.some((declaration) => this.#program.isSourceFileDefaultLibrary(declaration.getSourceFile()))) {
      return Term.libIri(symbol.name);
    }
    return undefined;
  }

  symbolOf(iri: string): ts.Symbol | undefined {
    return this.#registry.symbols.get(iri);
  }

  /** A `tsc` type as a term; `ignoreAlias` expands a top-level alias instead of naming it. */
  convert(type: ts.Type, ignoreAlias = false, depth = 0): Converted {
    if (depth > 12) {
      return INEXPRESSIBLE;
    }
    const checker = this.#checker;
    const next = (inner: ts.Type) => this.convert(inner, false, depth + 1);
    const all = (types: readonly ts.Type[]): Term.Type[] | undefined => {
      const converted = types.map(next);
      return converted.every((entry): entry is Term.Type => entry !== INEXPRESSIBLE) ? converted : undefined;
    };
    if (!ignoreAlias && type.aliasSymbol) {
      const alias = this.nameOf(type.aliasSymbol);
      const args = all(type.aliasTypeArguments ?? []);
      if (alias && args) {
        return Term.ref(alias, args);
      }
    }
    const flags = type.flags;
    if (flags & ts.TypeFlags.Any) {
      return Term.any;
    }
    if (flags & ts.TypeFlags.Unknown) {
      return Term.primitive('unknown');
    }
    if (flags & ts.TypeFlags.String) {
      return Term.string;
    }
    if (flags & ts.TypeFlags.Number) {
      return Term.number;
    }
    if (flags & ts.TypeFlags.Boolean) {
      return Term.boolean;
    }
    if (flags & ts.TypeFlags.BigInt) {
      return Term.bigint;
    }
    if (flags & ts.TypeFlags.ESSymbol) {
      return Term.primitive('symbol');
    }
    if (flags & ts.TypeFlags.Void) {
      return Term.void_;
    }
    if (flags & ts.TypeFlags.Undefined) {
      return Term.undefined_;
    }
    if (flags & ts.TypeFlags.Null) {
      return Term.null_;
    }
    if (flags & ts.TypeFlags.Never) {
      return Term.never;
    }
    if (flags & ts.TypeFlags.NonPrimitive) {
      return Term.primitive('object');
    }
    if (flags & ts.TypeFlags.EnumLike) {
      return INEXPRESSIBLE;
    }
    if (type.isStringLiteral() || type.isNumberLiteral()) {
      return Term.literal(type.value);
    }
    if (flags & ts.TypeFlags.BooleanLiteral) {
      return Term.literal(checker.typeToString(type) === 'true');
    }
    if (flags & ts.TypeFlags.BigIntLiteral && type.isLiteral() && typeof type.value === 'object') {
      const value = BigInt(type.value.base10Value);
      return Term.literal(type.value.negative ? -value : value);
    }
    if (type.isUnion()) {
      const members = all(type.types);
      return members ? Term.union(members) : INEXPRESSIBLE;
    }
    if (type.isIntersection()) {
      const members = all(type.types);
      return members ? Term.intersection(members) : INEXPRESSIBLE;
    }
    if (flags & ts.TypeFlags.TypeParameter) {
      return type.symbol ? Term.param(type.symbol.name) : INEXPRESSIBLE;
    }
    if (!(flags & ts.TypeFlags.Object)) {
      return INEXPRESSIBLE;
    }
    const objectFlags = objectFlagsOf(type);
    if (isTypeReference(type)) {
      const target = type.target;
      const args = checker.getTypeArguments(type);
      if (isTupleTarget(target)) {
        const tuple = target;
        const elements = all(args.slice(0, tuple.elementFlags.length));
        if (!elements) {
          return INEXPRESSIBLE;
        }
        if (tuple.elementFlags.some((elementFlags) => elementFlags & ts.ElementFlags.Variadic)) {
          return INEXPRESSIBLE;
        }
        return Term.tuple(
          elements.map((element, index) => {
            const optional = (tuple.elementFlags[index] & ts.ElementFlags.Optional) !== 0;
            return {
              type: optional ? Term.without(element, ['undefined']) : element,
              optional,
              rest: (tuple.elementFlags[index] & ts.ElementFlags.Rest) !== 0,
            };
          }),
          tuple.readonly,
        );
      }
      const head = this.nameOf(target.symbol);
      const converted = all(args.slice(0, target.typeParameters?.length ?? 0));
      return head && converted ? Term.ref(head, converted) : INEXPRESSIBLE;
    }
    if (objectFlags & ts.ObjectFlags.ClassOrInterface) {
      const head = this.nameOf(type.symbol);
      return head ? Term.ref(head) : INEXPRESSIBLE;
    }
    const symbol = type.symbol;
    if (symbol && symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.ValueModule | ts.SymbolFlags.Enum)) {
      const head = this.nameOf(symbol);
      return head && symbol.flags & ts.SymbolFlags.Class ? Term.typeOf(head) : INEXPRESSIBLE;
    }
    const properties = checker.getPropertiesOfType(type);
    const calls = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    const constructs = checker.getSignaturesOfType(type, ts.SignatureKind.Construct);
    const indexes = checker.getIndexInfosOfType(type);
    if (constructs.length > 0) {
      return INEXPRESSIBLE;
    }
    if (calls.length > 0) {
      return calls.length === 1 && properties.length === 0 && indexes.length === 0
        ? this.signature(calls[0], depth)
        : INEXPRESSIBLE;
    }
    const convertedProperties: Term.Property[] = [];
    for (const property of properties) {
      if (property.name.startsWith('__@')) {
        return INEXPRESSIBLE;
      }
      const propertyType = next(checker.getTypeOfSymbol(property));
      if (propertyType === INEXPRESSIBLE) {
        return INEXPRESSIBLE;
      }
      const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
      convertedProperties.push({
        name: property.name,
        type: optional ? Term.without(propertyType, ['undefined']) : propertyType,
        optional,
        readonly: isReadonlyProperty(property),
      });
    }
    const convertedIndexes: Term.IndexSignature[] = [];
    for (const index of indexes) {
      const key = next(index.keyType);
      const value = next(index.type);
      if (key === INEXPRESSIBLE || value === INEXPRESSIBLE) {
        return INEXPRESSIBLE;
      }
      convertedIndexes.push({ key, type: value, readonly: index.isReadonly });
    }
    return Term.object(convertedProperties, convertedIndexes);
  }

  signature(signature: ts.Signature, depth: number): Converted {
    const checker = this.#checker;
    if (signature.thisParameter) {
      return INEXPRESSIBLE;
    }
    const params: Term.Param[] = [];
    for (const parameter of signature.parameters) {
      const declaration = parameter.valueDeclaration;
      if (!declaration || !ts.isParameter(declaration)) {
        return INEXPRESSIBLE;
      }
      const type = this.convert(checker.getTypeOfSymbol(parameter), false, depth + 1);
      if (type === INEXPRESSIBLE) {
        return INEXPRESSIBLE;
      }
      const optional = checker.isOptionalParameter(declaration) && !declaration.dotDotDotToken;
      params.push({
        type: optional ? Term.without(type, ['undefined']) : type,
        optional,
        rest: declaration.dotDotDotToken !== undefined,
      });
    }
    const returns = this.convert(checker.getReturnTypeOfSignature(signature), false, depth + 1);
    if (returns === INEXPRESSIBLE) {
      return INEXPRESSIBLE;
    }
    return Term.fn(
      params,
      returns,
      (signature.typeParameters ?? []).map((parameter) => parameter.symbol.name),
    );
  }

  /**
   * Whether `tsc` binds a (qualified) type name to what `iri` names: through this file's import of
   * its root identifier — the IRI is then the binding's member path — or directly to a local or
   * global symbol registered under it.
   */
  #bindsTo(typeName: ts.EntityName, iri: string): boolean {
    const path: string[] = [];
    let root: ts.EntityName = typeName;
    while (ts.isQualifiedName(root)) {
      path.unshift(root.right.text);
      root = root.left;
    }
    const rootSymbol = this.#checker.getSymbolAtLocation(root);
    const importDeclaration = rootSymbol?.declarations?.find(
      (declaration) =>
        (ts.isImportSpecifier(declaration) || ts.isNamespaceImport(declaration) || ts.isImportClause(declaration)) &&
        declaration.getSourceFile() === this.#source,
    );
    const binding = this.#bindings.get(root.text);
    if (importDeclaration && binding) {
      const expected = boundaryIri(binding, path);
      return expected !== undefined && this.equivalent(expected, iri);
    }
    const name = ts.isQualifiedName(typeName) ? typeName.right : typeName;
    const symbol = this.#checker.getSymbolAtLocation(name);
    const target = symbol && symbol.flags & ts.SymbolFlags.Alias ? this.#checker.getAliasedSymbol(symbol) : symbol;
    const isLib =
      iri.startsWith(Term.LIB_BASE) && target?.name === iri.slice(Term.LIB_BASE.length) && this.nameOf(target) === iri;
    return (
      isLib ||
      (target !== undefined && (this.#registry.names.get(target) ?? []).some((known) => this.equivalent(known, iri)))
    );
  }

  /** What a named type the propagator wrote stands for, when `tsc` reports it expanded. */
  expandRef(iri: string, args: readonly Term.Type[]): Term.Type[] {
    const symbol = this.symbolOf(iri);
    if (!symbol) {
      return [];
    }
    const checker = this.#checker;
    const declared = checker.getDeclaredTypeOfSymbol(symbol);
    const expansions: Term.Type[] = [];
    if (symbol.flags & ts.SymbolFlags.TypeAlias && args.length === 0) {
      const variants: Converted[] = [this.convert(declared, true), this.convert(declared)];
      for (const expanded of variants) {
        if (expanded !== INEXPRESSIBLE) {
          expansions.push(expanded);
        }
      }
    }
    // Trailing defaults the propagator did not write.
    const typeParameters = typeParametersOf(declared);
    if (args.length < typeParameters.length) {
      const filled = [...args];
      for (const parameter of typeParameters.slice(args.length)) {
        const fallback = checker.getDefaultFromTypeParameter(parameter);
        const converted = fallback ? this.convert(fallback) : INEXPRESSIBLE;
        if (converted === INEXPRESSIBLE) {
          return expansions;
        }
        filled.push(converted);
      }
      expansions.push(Term.ref(iri, filled));
    }
    return expansions;
  }

  expandTypeof(iri: string): Term.Type | undefined {
    const symbol = this.symbolOf(iri);
    if (!symbol) {
      return undefined;
    }
    const converted = this.convert(this.#checker.getTypeOfSymbol(symbol));
    return converted === INEXPRESSIBLE || (converted.kind === 'typeof' && converted.iri === iri)
      ? undefined
      : converted;
  }
}

/** Compare the propagator's term with `tsc`'s; unknown positions in `mine` make the result partial. */
const compare = (mine: Term.Type, theirs: Term.Type, file: TscFile, depth = 0): Verdict => {
  if (mine.kind === 'unresolved' || mine.kind === 'returnOf') {
    return 'partial';
  }
  if (Term.text(mine) === Term.text(theirs)) {
    return 'agree';
  }
  if (theirs.kind === 'primitive' && theirs.name === 'any') {
    return 'skipped';
  }
  if (depth > 8) {
    return 'disagree';
  }
  const recurse = (left: Term.Type, right: Term.Type) => compare(left, right, file, depth + 1);
  const structural = (): Verdict => {
    switch (mine.kind) {
      case 'ref':
        if (theirs.kind === 'ref' && file.equivalent(mine.iri, theirs.iri) && theirs.args.length === mine.args.length) {
          return mine.args.reduce<Verdict>(
            (verdict, arg, index) => worst(verdict, recurse(arg, theirs.args[index])),
            'agree',
          );
        }
        return 'disagree';
      case 'union': {
        // `A | undefined` with `A` an alias of a union is the flat union to `tsc`: expand named members.
        const flatten = (members: readonly Term.Type[]): Term.Type[] =>
          members.flatMap((member) => {
            const expanded =
              member.kind === 'ref'
                ? file.expandRef(member.iri, member.args).find((entry) => entry.kind === 'union')
                : undefined;
            return expanded?.kind === 'union' ? expanded.members : [member];
          });
        const flat = Term.union(flatten(mine.members));
        if (flat.kind === 'union' && flat.members.length !== mine.members.length) {
          return recurse(flat, theirs);
        }
        const theirMembers = theirs.kind === 'union' ? theirs.members : [theirs];
        if (theirMembers.length !== mine.members.length) {
          return mine.members.some((member) => member.kind === 'unresolved' || member.kind === 'returnOf')
            ? 'partial'
            : 'disagree';
        }
        const remaining = [...theirMembers];
        let verdict: Verdict = 'agree';
        // Exact members first, partial ones last, so an unknown member cannot take another's match.
        const ordered = [...mine.members].sort(
          (left, right) => Number(Term.isPartial(left)) - Number(Term.isPartial(right)),
        );
        for (const member of ordered) {
          const index = remaining.findIndex((candidate) => recurse(member, candidate) !== 'disagree');
          if (index < 0) {
            return 'disagree';
          }
          verdict = worst(verdict, recurse(member, remaining[index]));
          remaining.splice(index, 1);
        }
        return verdict;
      }
      case 'intersection':
        if (theirs.kind !== 'intersection' || theirs.members.length !== mine.members.length) {
          return 'disagree';
        }
        return mine.members.reduce<Verdict>(
          (verdict, member, index) => worst(verdict, recurse(member, theirs.members[index])),
          'agree',
        );
      case 'object': {
        if (
          theirs.kind !== 'object' ||
          theirs.properties.length !== mine.properties.length ||
          theirs.indexes.length !== mine.indexes.length
        ) {
          return 'disagree';
        }
        let verdict: Verdict = 'agree';
        for (const [index, property] of mine.properties.entries()) {
          const other = theirs.properties[index];
          if (
            other.name !== property.name ||
            other.optional !== property.optional ||
            other.readonly !== property.readonly
          ) {
            return 'disagree';
          }
          verdict = worst(verdict, recurse(property.type, other.type));
        }
        for (const [index, signature] of mine.indexes.entries()) {
          const other = theirs.indexes[index];
          verdict = worst(verdict, worst(recurse(signature.key, other.key), recurse(signature.type, other.type)));
        }
        return verdict;
      }
      case 'tuple': {
        if (
          theirs.kind !== 'tuple' ||
          theirs.readonly !== mine.readonly ||
          theirs.elements.length !== mine.elements.length
        ) {
          return 'disagree';
        }
        return mine.elements.reduce<Verdict>((verdict, element, index) => {
          const other = theirs.elements[index];
          return other.optional !== element.optional || other.rest !== element.rest
            ? 'disagree'
            : worst(verdict, recurse(element.type, other.type));
        }, 'agree');
      }
      case 'function': {
        if (
          theirs.kind !== 'function' ||
          theirs.params.length !== mine.params.length ||
          theirs.typeParams.join() !== mine.typeParams.join()
        ) {
          return 'disagree';
        }
        let verdict = recurse(mine.returns, theirs.returns);
        for (const [index, entry] of mine.params.entries()) {
          const other = theirs.params[index];
          if (other.optional !== entry.optional || other.rest !== entry.rest) {
            return 'disagree';
          }
          verdict = worst(verdict, recurse(entry.type, other.type));
        }
        return verdict;
      }
      default:
        return 'disagree';
    }
  };
  const direct = structural();
  if (direct !== 'disagree') {
    return direct;
  }
  // Same type, spelled differently: expand whichever side is named.
  const alternatives: Array<[Term.Type, Term.Type]> = [];
  // The ref names what its syntax names: check the written arguments, then take `tsc`'s reading of
  // the whole node in place of the name.
  const read = mine.kind === 'ref' ? file.syntaxType(mine) : undefined;
  if (
    mine.kind === 'ref' &&
    read !== undefined &&
    read.type !== INEXPRESSIBLE &&
    Term.text(read.type) !== Term.text(mine) &&
    read.args.length === mine.args.length &&
    read.args.every((arg, index) => arg !== INEXPRESSIBLE && recurse(mine.args[index], arg) !== 'disagree')
  ) {
    alternatives.push([read.type, theirs]);
  }
  if (mine.kind === 'ref') {
    alternatives.push(
      ...file.expandRef(mine.iri, mine.args).map((expanded): [Term.Type, Term.Type] => [expanded, theirs]),
    );
  }
  if (theirs.kind === 'ref') {
    alternatives.push(
      ...file.expandRef(theirs.iri, theirs.args).map((expanded): [Term.Type, Term.Type] => [mine, expanded]),
    );
  }
  if (mine.kind === 'typeof') {
    const expanded = file.expandTypeof(mine.iri);
    if (expanded) {
      alternatives.push([expanded, theirs]);
    }
  }
  for (const [left, right] of alternatives) {
    const verdict = recurse(left, right);
    if (verdict !== 'disagree') {
      return verdict;
    }
  }
  return 'disagree';
};

const lineOf = (source: string, offset: number) => source.slice(0, offset).split('\n').length;

export type CompareOptions = {
  readonly root: string;
  readonly resolve: Resolve;
  readonly packageOf?: AnalyzeContext['packageOf'];
};

/** Score every variable and function declaration in `files` (repo-relative). */
export const compareFiles = (files: readonly string[], options: CompareOptions): Result => {
  const { root } = options;
  const absolute = files.map((file) => join(root, file));
  const program = ts.createProgram(absolute, compilerOptions(root));
  const score = emptyScore();
  const findings: Finding[] = [];
  const reasons = new Map<string, number>();
  let bound = 0;
  // The cross-file pass needs the declaring files' facts: every repository file the program loaded.
  const documents = program
    .getSourceFiles()
    .map((sourceFile) => relative(root, sourceFile.fileName))
    .filter(
      (path) =>
        !path.startsWith('..') && !path.includes('node_modules') && !path.endsWith('.d.ts') && isTypeScriptPath(path),
    )
    .map((path) =>
      analyzeTypeScript({
        root,
        path,
        source: readFileSync(join(root, path), 'utf8'),
        mtime: 0,
        resolve: options.resolve,
        packageOf: options.packageOf ?? (() => undefined),
      }),
    );
  const { bind } = binder(envFromDocuments(documents));
  // Every repository file's routes go into the registry before any comparison runs.
  const registry = new Registry();
  for (const document of documents) {
    const sourceFile = program.getSourceFile(join(root, document.path));
    if (sourceFile) {
      const { bindings } = inferFile({
        root,
        path: document.path,
        source: sourceFile.text,
        mtime: 0,
        resolve: options.resolve,
        packageOf: options.packageOf ?? (() => undefined),
      });
      new TscFile(program, sourceFile, document.path, bindings, registry);
    }
  }
  for (const path of files) {
    const sourceFile = program.getSourceFile(join(root, path));
    if (!sourceFile) {
      continue;
    }
    const source = readFileSync(join(root, path), 'utf8');
    const context: AnalyzeContext = {
      root,
      path,
      source,
      mtime: 0,
      resolve: options.resolve,
      packageOf: options.packageOf ?? (() => undefined),
    };
    const { program: ast, bindings, inference } = inferFile(context);
    const tsc = new TscFile(program, sourceFile, path, bindings, registry);

    // `tsc` declaration names by offset, to pair with oxc's binding identifiers.
    const tscNames = new Map<number, ts.Identifier>();
    const visit = (node: ts.Node) => {
      if (
        (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        tscNames.set(node.name.getStart(sourceFile), node.name);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    const targets: Array<{ id: Node; topLevel: boolean }> = [];
    walk(ast, [], (node, ancestors) => {
      const id = child(node, 'id');
      if ((node.type === 'VariableDeclarator' || node.type === 'FunctionDeclaration') && id?.type === 'Identifier') {
        const topLevel = ancestors.every((ancestor) =>
          ['Program', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'VariableDeclaration'].includes(
            ancestor.type,
          ),
        );
        targets.push({ id, topLevel });
      }
      return undefined;
    });

    for (const { id, topLevel } of targets) {
      const name = String(id.name);
      const tscName = tscNames.get(id.start);
      const symbol = tscName ? tsc.checker.getSymbolAtLocation(tscName) : undefined;
      if (!symbol) {
        continue;
      }
      const local = inference.binding(id);
      const mine = hasDeferred(local) ? bind(local) : local;
      if (Term.text(mine) !== Term.text(local)) {
        bound++;
      }
      reasonsOf(mine, reasons);
      const theirsType = tsc.checker.getTypeOfSymbol(symbol);
      const theirs = tsc.convert(theirsType);
      const theirsText = theirs === INEXPRESSIBLE ? tsc.checker.typeToString(theirsType) : Term.text(theirs);
      let verdict: Verdict;
      if (
        theirs === INEXPRESSIBLE ||
        (theirs.kind === 'primitive' && theirs.name === 'any' && !(mine.kind === 'primitive' && mine.name === 'any'))
      ) {
        // `tsc` has no answer we can state (or only `any`, from an import it could not resolve).
        verdict = 'skipped';
      } else if (mine.kind === 'unresolved') {
        verdict = 'unresolved';
      } else if (mine.kind === 'returnOf') {
        verdict = 'deferred';
      } else {
        verdict = compare(mine, theirs, tsc);
      }
      score[verdict]++;
      findings.push({
        path,
        line: lineOf(source, id.start),
        name,
        topLevel,
        verdict,
        mine: Term.text(mine),
        theirs: theirsText,
      });
    }
  }
  return {
    score,
    findings,
    bound,
    reasons: [...reasons].sort(([, left], [, right]) => right - left),
  };
};
