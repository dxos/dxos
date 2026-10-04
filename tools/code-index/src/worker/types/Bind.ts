//
// Copyright 2026 DXOS.org
//

import { escapeFragment } from '../../internal/iri.ts';
import * as Ontology from '../../Ontology.ts';
import { applyTypes } from './Call.ts';
import * as Term from './Term.ts';

/**
 * The cross-file pass (`design/TYPES.md`, "Binding"). Per-file inference names what another file
 * declares — `typeof X`, `returnOf(callee)(args)` — and this pass binds those names to the declaring
 * symbol's own term, following re-exports, namespace barrels and bare specifiers that resolve inside
 * the repository. What cannot be bound stays deferred; nothing is guessed.
 */

/** What the pass needs to know about one symbol, read from its file's graph. */
export type SymbolFacts = {
  readonly term: Term.Type | undefined;
  /** `export { x as y } from …` — the declaration the alias stands for. */
  readonly aliasOf: readonly string[];
  /** `export * as N from …` — the file a namespace symbol publishes whole. */
  readonly namespaceOf: readonly string[];
  /** Every `deus:kind`, since a class or function merged with a `namespace` declares one IRI twice. */
  readonly kinds?: readonly string[];
};

export type Env = {
  /** Facts for a symbol IRI (`file:<path>#<name>`), if the file declares it. */
  readonly symbol: (iri: string) => SymbolFacts | undefined;
  /** The file IRI a bare specifier's module IRI resolves to, inside the repository. */
  readonly moduleFile: (moduleIri: string) => string | undefined;
  /** Files a file re-exports wholesale (`export * from …`). */
  readonly reexports: (fileIri: string) => readonly string[];
};

/** A resolved value: its term, or a declaration that has no term of its own (a class, a namespace). */
type Resolved =
  | { readonly kind: 'term'; readonly term: Term.Type }
  | { readonly kind: 'declaration'; readonly iri: string };

const MAX_DEPTH = 24;

const split = (iri: string): { file: string; path: readonly string[] } | undefined => {
  const hash = iri.indexOf('#');
  if (hash < 0) {
    return undefined;
  }
  const name = decodeURIComponent(iri.slice(hash + 1));
  return name.length > 0 ? { file: iri.slice(0, hash), path: name.split('.') } : undefined;
};

const symbolIri = (file: string, path: readonly string[]): string => `${file}#${escapeFragment(path.join('.'))}`;

const propertyType = (term: Term.Type, name: string): Term.Type | undefined => {
  if (term.kind !== 'object') {
    return undefined;
  }
  const property = term.properties.find((candidate) => candidate.name === name);
  return property && !property.optional ? property.type : undefined;
};

export const binder = (env: Env) => {
  const resolveIri = (iri: string, depth: number): Resolved | undefined => {
    if (depth > MAX_DEPTH) {
      return undefined;
    }
    if (iri.startsWith(Ontology.MODULE_BASE)) {
      const parts = split(iri);
      const file = parts ? env.moduleFile(iri.slice(0, iri.indexOf('#'))) : undefined;
      return parts && file ? resolvePath(file, parts.path, depth + 1) : undefined;
    }
    const parts = split(iri);
    return parts ? resolvePath(parts.file, parts.path, depth + 1) : undefined;
  };

  /** `path` in `file`: the longest declared prefix, then namespaces, aliases or object properties for the rest. */
  const resolvePath = (file: string, path: readonly string[], depth: number): Resolved | undefined => {
    if (depth > MAX_DEPTH) {
      return undefined;
    }
    for (let length = path.length; length >= 1; length--) {
      const head = path.slice(0, length);
      const rest = path.slice(length);
      const iri = symbolIri(file, head);
      const facts = env.symbol(iri);
      if (!facts) {
        continue;
      }
      if (facts.aliasOf.length > 0) {
        const target = facts.aliasOf[0];
        return resolveIri(rest.length > 0 ? `${target}.${rest.join('.')}` : target, depth + 1);
      }
      if (facts.namespaceOf.length > 0) {
        return rest.length > 0 ? resolvePath(facts.namespaceOf[0], rest, depth + 1) : { kind: 'declaration', iri };
      }
      if (rest.length === 0) {
        return facts.term && facts.term.kind !== 'unresolved'
          ? { kind: 'term', term: facts.term }
          : { kind: 'declaration', iri };
      }
      // A member of a value: only a property of a known object type, never a guess.
      let current = facts.term ? bind(facts.term, depth + 1) : undefined;
      for (const name of rest) {
        current = current ? propertyType(current, name) : undefined;
      }
      return current ? { kind: 'term', term: current } : undefined;
    }
    for (const target of env.reexports(file)) {
      const found = resolvePath(target, path, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  const settle = (type: Term.Type, pending: readonly Term.Pending[]): Term.Type =>
    pending.reduce<Term.Type>((current, operation) => {
      switch (operation) {
        case 'widen':
          return Term.widen(current);
        case 'settle':
          return Term.settle(current);
        case 'nonNullish':
          return Term.without(current, ['null', 'undefined']);
        case 'noUndefined':
          return Term.without(current, ['undefined']);
      }
    }, type);

  const bind = (type: Term.Type, depth = 0): Term.Type => {
    if (depth > MAX_DEPTH) {
      return type;
    }
    const next = (inner: Term.Type) => bind(inner, depth + 1);
    switch (type.kind) {
      case 'typeof': {
        const resolved = resolveIri(type.iri, depth + 1);
        if (!resolved) {
          return type;
        }
        if (resolved.kind === 'declaration') {
          // A class or namespace has no term to substitute; its declaration is the canonical name.
          return resolved.iri === type.iri ? type : Term.typeOf(resolved.iri, type.pending);
        }
        return settle(next(resolved.term), type.pending);
      }
      case 'returnOf': {
        const callee = next(type.callee);
        const args = type.args.map(next);
        if (callee.kind !== 'function') {
          return Term.returnOf(callee, args, type.pending);
        }
        const result = applyTypes(callee, args);
        return result.kind === 'unresolved' ? Term.unresolved(`bind:${result.reason}`) : settle(result, type.pending);
      }
      case 'ref':
        return Term.ref(type.iri, type.args.map(next), type.origin);
      case 'union':
        return Term.union(type.members.map(next));
      case 'intersection':
        return Term.intersection(type.members.map(next));
      case 'object':
        return Term.object(
          type.properties.map((property) => ({ ...property, type: next(property.type) })),
          type.indexes.map((index) => ({ ...index, type: next(index.type) })),
        );
      case 'tuple':
        return Term.tuple(
          type.elements.map((element) => ({ ...element, type: next(element.type) })),
          type.readonly,
        );
      case 'function':
        return Term.fn(
          type.params.map((entry) => ({ ...entry, type: next(entry.type) })),
          next(type.returns),
          type.typeParams,
        );
      default:
        return type;
    }
  };

  return { bind: (type: Term.Type) => bind(type), resolve: (iri: string) => resolveIri(iri, 0) };
};

/**
 * Kinds that stand for a declaration elsewhere rather than being one. Not `namespace`: a TypeScript
 * `namespace` is a declaration, and an `export * as N` alias is already known by its `namespaceOf`.
 */
const REFERENCE_KINDS: ReadonlySet<string> = new Set(['reexport']);

/** Whether the facts are a declaration proper: neither an alias, a namespace barrel, nor a re-export. */
export const isDeclaration = (facts: SymbolFacts): boolean =>
  facts.aliasOf.length === 0 &&
  facts.namespaceOf.length === 0 &&
  (facts.kinds === undefined || facts.kinds.length === 0 || facts.kinds.some((kind) => !REFERENCE_KINDS.has(kind)));

/**
 * Resolves a reference IRI as an importer wrote it (`file:<barrel>#X`, `module:<specifier>#X.y`) to
 * the declaration it denotes, with the same semantics as {@link binder}'s resolution: the longest
 * declared prefix, then an alias, a namespace or `export *`, a local declaration shadowing a star
 * export. A member of a declaration (`Foo.bar` on a const) resolves to the declaration.
 */
export const declarations = (env: Env) => {
  // Shared by every lookup, since a pass resolves tens of thousands of names through the same barrels.
  const memo = new Map<string, string | undefined>();
  // Lookups in progress; meeting one again is a cycle of barrels.
  const active = new Set<string>();
  // Bumped whenever a walk is cut short, so a miss found under a cut is not remembered as a miss.
  let cuts = 0;

  const resolveIri = (iri: string, depth: number): string | undefined => {
    const parts = split(iri);
    if (!parts) {
      return undefined;
    }
    if (iri.startsWith(Ontology.MODULE_BASE)) {
      const file = env.moduleFile(parts.file);
      return file ? resolvePath(file, parts.path, depth + 1) : undefined;
    }
    return resolvePath(parts.file, parts.path, depth + 1);
  };

  const resolvePath = (file: string, path: readonly string[], depth: number): string | undefined => {
    const key = `${file}#${path.join('.')}`;
    if (memo.has(key)) {
      return memo.get(key);
    }
    if (depth > MAX_DEPTH || active.has(key)) {
      cuts++;
      return undefined;
    }
    const cutsBefore = cuts;
    active.add(key);
    const found = resolveUncached(file, path, depth);
    active.delete(key);
    if (found !== undefined || cuts === cutsBefore) {
      memo.set(key, found);
    }
    return found;
  };

  const resolveUncached = (file: string, path: readonly string[], depth: number): string | undefined => {
    for (let length = path.length; length >= 1; length--) {
      const head = path.slice(0, length);
      const rest = path.slice(length);
      const iri = symbolIri(file, head);
      const facts = env.symbol(iri);
      if (!facts) {
        continue;
      }
      if (facts.aliasOf.length > 0) {
        const target = facts.aliasOf[0];
        return resolveIri(rest.length > 0 ? `${target}.${rest.join('.')}` : target, depth + 1);
      }
      if (facts.namespaceOf.length > 0) {
        return rest.length > 0 ? resolvePath(facts.namespaceOf[0], rest, depth + 1) : undefined;
      }
      return isDeclaration(facts) ? iri : undefined;
    }
    for (const target of env.reexports(file)) {
      const found = resolvePath(target, path, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  return {
    /** The declaration `iri` denotes, or `undefined` when it is unknown, external or ambiguous. */
    declarationOf: (iri: string): string | undefined => resolveIri(iri, 0),
  };
};

/** Whether a term still names something in another file. */
export const hasDeferred = (type: Term.Type): boolean => {
  switch (type.kind) {
    case 'typeof':
    case 'returnOf':
      return true;
    case 'ref':
      return type.args.some(hasDeferred);
    case 'union':
    case 'intersection':
      return type.members.some(hasDeferred);
    case 'object':
      return type.properties.some((property) => hasDeferred(property.type));
    case 'tuple':
      return type.elements.some((element) => hasDeferred(element.type));
    case 'function':
      return hasDeferred(type.returns) || type.params.some((entry) => hasDeferred(entry.type));
    default:
      return false;
  }
};

/**
 * Module IRIs that resolve to exactly one file. A package-relative `#imports` specifier yields one
 * global module IRI that each importing package resolves to its own file, so it names no single file.
 */
export const uniqueModuleFiles = (pairs: Iterable<readonly [string, string]>): Map<string, string> => {
  const files = new Map<string, Set<string>>();
  for (const [module, file] of pairs) {
    const known = files.get(module);
    if (known) {
      known.add(file);
    } else {
      files.set(module, new Set([file]));
    }
  }
  const unique = new Map<string, string>();
  for (const [module, known] of files) {
    const [only, ...others] = known;
    if (others.length === 0) {
      unique.set(module, only);
    }
  }
  return unique;
};

/** An environment over analyzed documents — the harness's view, and the reasoner's after reading the store. */
export const envFromDocuments = (documents: readonly Ontology.FileDocument[]): Env => {
  const symbols = new Map<string, SymbolFacts>();
  const modules: (readonly [string, string])[] = [];
  const reexports = new Map<string, readonly string[]>();
  for (const document of documents) {
    reexports.set(document['@id'], document.reexports);
    for (const symbol of document.declares) {
      // A declaration merge (`class X` + `namespace X`) lists one IRI twice; keep both halves.
      const known = symbols.get(symbol['@id']);
      symbols.set(symbol['@id'], {
        term: known?.term ?? (symbol.typeTerm === undefined ? undefined : Term.fromJson(JSON.parse(symbol.typeTerm))),
        aliasOf: [...(known?.aliasOf ?? []), ...symbol.aliasOf],
        namespaceOf: [...(known?.namespaceOf ?? []), ...(symbol.namespaceOf ?? [])],
        kinds: [...(known?.kinds ?? []), symbol.kind],
      });
    }
    for (const node of document['@included'] ?? []) {
      if (node['@type'] === 'Module') {
        modules.push([node['@id'], node.moduleFile]);
      }
    }
  }
  const moduleFile = uniqueModuleFiles(modules);
  return {
    symbol: (iri) => symbols.get(iri),
    moduleFile: (iri) => moduleFile.get(iri),
    reexports: (file) => reexports.get(file) ?? [],
  };
};
