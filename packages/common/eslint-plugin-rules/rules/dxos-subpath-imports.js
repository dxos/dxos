//
// Copyright 2026 DXOS.org
//

import { createRequire } from 'node:module';

/**
 * Packages whose barrel imports must be rewritten to per-namespace subpath imports. Only list a
 * package once its exports map carries an entry per namespace segment — the fix keeps names the
 * exports map cannot resolve (flat re-exports such as errors) on the barrel import.
 */
const DXOS_SUBPATH_PACKAGES = new Set(['@dxos/compute']);

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
    const requireForFile = createRequire(context.getFilename());
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

    const resolveExportToSegment = (pkgName, exportName) =>
      loadExportsForPackage(pkgName).has(exportName) ? exportName : null;

    return {
      ImportDeclaration: (node) => {
        const source = String(node.source.value);
        // Only rewrite BARREL imports of designated packages; subpath imports are already correct.
        if (!DXOS_SUBPATH_PACKAGES.has(source)) {
          return;
        }
        const packageName = source;

        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }
        const hasNamedImports = node.specifiers.some((spec) => spec.type === 'ImportSpecifier');
        if (!hasNamedImports) {
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
              ? `Use subpath imports for ${packageName}; unresolved kept in base import: ${unresolved.join(', ')}`
              : `Use subpath imports for ${packageName}`,
          fix: (fixer) => {
            const sourceCode = context.getSourceCode();
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
                imports.push(`import { ${specParts.join(', ')} } from '${packageName}';`);
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
