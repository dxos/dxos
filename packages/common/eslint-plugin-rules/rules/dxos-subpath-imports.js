//
// Copyright 2026 DXOS.org
//

import { createRequire } from 'node:module';

/**
 * Packages whose barrel imports must be rewritten to per-namespace subpath imports. Only list a
 * package once its exports map carries an entry per namespace segment — the fix keeps names the
 * exports map cannot resolve (flat re-exports such as errors) on the barrel import.
 */
// TODO(wittjosiah): Expand across all @dxos packages, enforcing a consistent namespaced API
//  surface repo-wide rather than an opt-in list. Each addition needs its exports map split per
//  namespace first, which for the remainder means the export-namespace -> module-file refactor.
const DXOS_SUBPATH_PACKAGES = new Set([
  '@dxos/app-framework',
  '@dxos/app-graph',
  '@dxos/app-toolkit',
  '@dxos/assistant-toolkit',
  '@dxos/compute',
  '@dxos/graph',
]);

/**
 * Every plugin package participates: consumers import the namespace they need
 * (`@dxos/plugin-sheet/Sheet`) instead of the barrel, which statically pulls the plugin's whole
 * component graph. Resolution is exports-map-driven, so a plugin without per-namespace entries
 * is a no-op. NOTE: the package must export `./package.json`, or the exports map is unreadable
 * under Node exports encapsulation and the rule silently skips it.
 */
const isSubpathPackage = (packageName) =>
  DXOS_SUBPATH_PACKAGES.has(packageName) || packageName.startsWith('@dxos/plugin-');

/**
 * The legacy aggregate entrypoint. It re-exports exactly the namespaces that now have their own
 * subpath entries, so one import of it statically drags every sibling namespace of the plugin —
 * these are Effect/ECHO schemas, runtime values rather than erased types, so the barrel problem
 * comes back in full. Rewritten like a barrel, resolving against the parent package.
 */
const AGGREGATE_SUBPATH = 'types';

/**
 * Splits an import source into its package and the subpath beneath it. Scoped packages carry
 * their scope in the first segment, so the package is always the first two segments.
 * @example '@dxos/plugin-game' -> { packageName: '@dxos/plugin-game', subpath: undefined }
 * @example '@dxos/plugin-game/types' -> { packageName: '@dxos/plugin-game', subpath: 'types' }
 */
const parseSource = (source) => {
  const parts = source.split('/');
  if (parts.length <= 2) {
    return { packageName: source, subpath: undefined };
  }
  return { packageName: parts.slice(0, 2).join('/'), subpath: parts.slice(2).join('/') };
};

/**
 * ESLint rule to transform barrel imports of designated @dxos packages into subpath imports,
 * mirroring `effect-subpath-imports`. A subpath import keeps the barrel's siblings out of the
 * module graph entirely, so a light API (e.g. `Operation`) is not taxed by a heavy one
 * (e.g. `Header` -> `@effect/platform/HttpClient`).
 * @example
 * // before
 * import { Operation, type Trace } from '@dxos/compute';
 *
 * // after
 * import * as Operation from '@dxos/compute/Operation';
 * import type * as Trace from '@dxos/compute/Trace';
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce subpath imports for designated @dxos packages',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    // `context.filename` / `context.sourceCode` are the ESLint 9 accessors; the getters are kept
    // as a fallback so the rule runs under both the flat RuleTester and older config paths.
    const requireForFile = createRequire(context.filename ?? context.getFilename());
    const exportsCache = new Map(); // packageName -> Set<segment>

    const loadExportsForPackage = (pkgName) => {
      if (exportsCache.has(pkgName)) {
        return exportsCache.get(pkgName);
      }
      try {
        const pkgJson = requireForFile(`${pkgName}/package.json`);
        const ex = pkgJson && pkgJson.exports;
        const segments = new Set();
        if (ex && typeof ex === 'object') {
          for (const key of Object.keys(ex)) {
            if (key === '.' || key === './package.json') {
              continue;
            }
            if (key.startsWith('./')) {
              segments.add(key.slice(2));
            }
          }
        }
        exportsCache.set(pkgName, segments);
        return segments;
      } catch {
        const empty = new Set();
        exportsCache.set(pkgName, empty);
        return empty;
      }
    };

    // Namespace subpaths are PascalCase by convention (`Chess`, `ChessEvents`, `SpaceSchema`);
    // lowercase keys are module entrypoints (`translations`, `testing`, `plugin`) whose namespace
    // object is NOT the named export of the same name. Matching those purely lexically rewrote
    // `import { translations }` to a namespace import of a different runtime value, and every
    // plugin carries such a key — so the hazard was standing rather than hypothetical.
    const isNamespaceSegment = (segment) => /^[A-Z]/.test(segment);

    const resolveExportToSegment = (pkgName, exportName) =>
      isNamespaceSegment(exportName) && loadExportsForPackage(pkgName).has(exportName) ? exportName : null;

    return {
      ImportDeclaration: (node) => {
        const source = String(node.source.value);
        const { packageName, subpath } = parseSource(source);
        if (!isSubpathPackage(packageName)) {
          return;
        }
        // The barrel and the aggregate `/types` entry both need rewriting; a per-namespace
        // subpath is already correct. Names that resolve to neither stay on the original source,
        // so a partial migration never loses an export.
        if (subpath !== undefined && subpath !== AGGREGATE_SUBPATH) {
          return;
        }

        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }
        const hasNamedImports = node.specifiers.some((spec) => spec.type === 'ImportSpecifier');
        if (!hasNamedImports) {
          return;
        }
        // The fix replaces the whole declaration and only re-emits `ImportSpecifier`s, so a default
        // or namespace binding alongside them would be silently deleted — an autofix that
        // introduces a compile error. Leave the mixed form to a human.
        if (node.specifiers.some((spec) => spec.type !== 'ImportSpecifier')) {
          return;
        }

        const typeImports = [];
        const regularImports = [];
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') {
            continue;
          }
          const entry = { imported: specifier.imported.name, local: specifier.local.name };
          if (specifier.importKind === 'type') {
            typeImports.push(entry);
          } else {
            regularImports.push(entry);
          }
        }

        const resolvedType = [];
        const unresolvedType = [];
        const resolvedRegular = [];
        const unresolvedRegular = [];
        typeImports.forEach((spec) => {
          const segment = resolveExportToSegment(packageName, spec.imported);
          (segment ? resolvedType : unresolvedType).push(segment ? { ...spec, segment } : spec);
        });
        regularImports.forEach((spec) => {
          const segment = resolveExportToSegment(packageName, spec.imported);
          (segment ? resolvedRegular : unresolvedRegular).push(segment ? { ...spec, segment } : spec);
        });

        if (resolvedType.length === 0 && resolvedRegular.length === 0) {
          return;
        }
        const unresolved = [...unresolvedType, ...unresolvedRegular].map(({ imported }) => imported);

        context.report({
          node,
          message:
            unresolved.length > 0
              ? `Use subpath imports for ${source}; unresolved kept in base import: ${unresolved.join(', ')}`
              : `Use subpath imports for ${source}`,
          fix: (fixer) => {
            const sourceCode = context.sourceCode ?? context.getSourceCode();
            const imports = [];

            const bySegment = new Map(); // segment -> { regular: [...], type: [...] }
            const groupOf = (segment) => {
              let group = bySegment.get(segment);
              if (!group) {
                group = { regular: [], type: [] };
                bySegment.set(segment, group);
              }
              return group;
            };
            resolvedRegular.forEach((entry) => groupOf(entry.segment).regular.push(entry));
            resolvedType.forEach((entry) => groupOf(entry.segment).type.push(entry));

            for (const [segment, group] of bySegment) {
              const merged = [...group.regular];
              for (const t of group.type) {
                if (!group.regular.some((r) => r.local === t.local)) {
                  merged.push(t);
                }
              }
              const seen = new Set();
              for (const { imported, local } of merged) {
                const alias = imported !== local ? local : imported;
                if (seen.has(alias)) {
                  continue;
                }
                seen.add(alias);
                const isTypeOnly =
                  group.type.some((t) => t.imported === imported) &&
                  !group.regular.some((r) => r.imported === imported);
                imports.push(
                  isTypeOnly
                    ? `import type * as ${alias} from '${packageName}/${segment}';`
                    : `import * as ${alias} from '${packageName}/${segment}';`,
                );
              }
            }

            if (unresolvedType.length || unresolvedRegular.length) {
              // Prefer value over type for the same local alias when both are present.
              const byLocal = new Map();
              unresolvedRegular.forEach((s) => {
                const entry = byLocal.get(s.local) ?? {};
                entry.value = s;
                byLocal.set(s.local, entry);
              });
              unresolvedType.forEach((s) => {
                const entry = byLocal.get(s.local) ?? {};
                if (!entry.value) {
                  entry.type = s;
                }
                byLocal.set(s.local, entry);
              });
              const specParts = [];
              for (const entry of byLocal.values()) {
                const spec = entry.value ?? entry.type;
                const prefix = entry.value ? '' : 'type ';
                specParts.push(
                  spec.imported !== spec.local
                    ? `${prefix}${spec.imported} as ${spec.local}`
                    : `${prefix}${spec.imported}`,
                );
              }
              if (specParts.length) {
                imports.push(`import { ${specParts.join(', ')} } from '${source}';`);
              }
            }

            if (imports.length === 0) {
              return null;
            }
            const importIndent = sourceCode.text.slice(node.range[0] - node.loc.start.column, node.range[0]);
            return fixer.replaceText(node, imports.join('\n' + importIndent));
          },
        });
      },
    };
  },
};
