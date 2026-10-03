//
// Copyright 2026 DXOS.org
//

import * as Ontology from '../../Ontology.ts';
import { type Node, childList, isNode, nameOf } from '../analyzers/ast.ts';

/**
 * How a name that crosses the file boundary is spelled as an IRI — shared by the analyzer's
 * references, the type propagator, and the agreement harness, so all three name a symbol alike.
 */

export type ImportBinding = {
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

/**
 * `effect` and its `unstable/*` barrels publish every module whole (`export * as Layer from
 * './Layer.js'`), so `Layer.Layer` under `effect` is `Layer` under `effect/Layer`. Rewriting to the
 * module's own specifier gives one IRI per symbol however it was imported.
 */
const NAMESPACE_BARRELS = /^effect(\/unstable\/[a-z]+)?$/;

/** The member IRI a type or value reference names, canonicalized through namespace barrels. */
export const memberIri = (specifier: string, path: readonly string[]): string => {
  if (NAMESPACE_BARRELS.test(specifier) && path.length >= 2 && /^[A-Z]/.test(path[0])) {
    return memberIri(`${specifier}/${path[0]}`, path.slice(1));
  }
  return Ontology.memberIri(specifier, path.join('.')).value;
};

/**
 * The single IRI naming `binding` (through a member path) as a type or value: the member IRI for a
 * bare specifier, the resolved symbol for a relative one. `undefined` when it names nothing — a
 * namespace import with no member, or a relative specifier that did not resolve.
 */
export const boundaryIri = (binding: ImportBinding, path: readonly string[]): string | undefined => {
  const memberPath = binding.imported === '*' ? path : [binding.imported, ...path];
  if (memberPath.length === 0) {
    return undefined;
  }
  if (binding.bare) {
    return memberIri(binding.specifier, memberPath);
  }
  return binding.file ? Ontology.symbolIri(binding.file, memberPath.join('.')).value : undefined;
};

/** The bindings one `import` declaration introduces, given where its specifier resolved. */
export const importBindings = (
  statement: Node,
  resolution: { readonly file: string | undefined; readonly bare: boolean },
): ImportBinding[] => {
  const source = isNode(statement.source) ? statement.source.value : undefined;
  if (typeof source !== 'string') {
    return [];
  }
  const declarationTypeOnly = statement.importKind === 'type';
  return childList(statement, 'specifiers').flatMap((node) => {
    const local = nameOf(isNode(node.local) ? node.local : undefined);
    if (!local) {
      return [];
    }
    const imported =
      node.type === 'ImportNamespaceSpecifier'
        ? '*'
        : node.type === 'ImportDefaultSpecifier'
          ? 'default'
          : (nameOf(isNode(node.imported) ? node.imported : undefined) ??
            (isNode(node.imported) && typeof node.imported.value === 'string' ? node.imported.value : local));
    return [
      {
        local,
        specifier: source,
        imported,
        typeOnly: declarationTypeOnly || node.importKind === 'type',
        file: resolution.file,
        bare: resolution.bare,
      },
    ];
  });
};
