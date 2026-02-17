//
// Copyright 2025 DXOS.org
//

import { createRequire } from 'node:module';

const EXCLUDED_EFFECT_PACKAGES = ['@effect/vitest'];

/**
 * Map of Effect base-package exports that come from a subpath (not a direct segment).
 * Used when resolving imports like `import { pipe } from 'effect'` → effect/Function.
 */
const EFFECT_EXPORT_TO_SUBPATH = {
  pipe: 'Function',
  flow: 'Function',
};

/**
 * Subpaths that allow named imports (e.g. `import { pipe, flow } from 'effect/Function'`).
 * Other subpaths still require namespace imports.
 */
const NAMED_IMPORT_ALLOWED_SUBPATHS = new Set(['Function']);

/**
 * ESLint rule to transform combined imports from 'effect' and '@effect/*'
 * into subpath imports except for the EXCLUDED_EFFECT_PACKAGES.
 * @example
 * // before
 * import { type Schema, SchemaAST } from 'effect';
 *
 * // after
 * import type * as Schema from 'effect/Schema'
 * import * as SchemaAST from 'effect/SchemaAST'
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce subpath imports for Effect packages',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    // Resolver and caches are scoped to this lint run.
    const requireForFile = createRequire(context.getFilename());
    const exportsCache = new Map(); // packageName -> Set<segment>

    const loadExportsForPackage = (pkgName) => {
      if (exportsCache.has(pkgName)) return exportsCache.get(pkgName);
      try {
        const pkgJson = requireForFile(`${pkgName}/package.json`);
        const ex = pkgJson && pkgJson.exports;
        const segments = new Set();
        if (ex && typeof ex === 'object') {
          for (const key of Object.keys(ex)) {
            // Keys like './Schema', './SchemaAST', './Function' (skip '.' and './package.json').
            if (key === '.' || key === './package.json') continue;
            if (key.startsWith('./')) segments.add(key.slice(2));
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

    const isValidSubpath = (pkgName, segment) => {
      const exported = loadExportsForPackage(pkgName);
      return exported.has(segment);
    };

    const resolveExportToSegment = (pkgName, exportName) => {
      if (isValidSubpath(pkgName, exportName)) return exportName;
      if (pkgName === 'effect' && EFFECT_EXPORT_TO_SUBPATH[exportName]) {
        const segment = EFFECT_EXPORT_TO_SUBPATH[exportName];
        return isValidSubpath(pkgName, segment) ? segment : null;
      }
      return null;
    };

    const isEffectPackage = (source) => {
      return source === 'effect' || source.startsWith('effect/') || source.startsWith('@effect/');
    };

    const shouldSkipEffectPackage = (basePackage) => {
      return EXCLUDED_EFFECT_PACKAGES.includes(basePackage);
    };

    /**
     * Get the base package name from a source string.
     * @param {string} source - The source string to get the base package name from.
     * @returns {string} The base package name.
     * @example
     * getBasePackage('effect/Schema') // 'effect'
     * getBasePackage('@effect/ai/openai') // '@effect/ai'
     */
    const getBasePackage = (source) => {
      if (source.startsWith('@')) {
        const parts = source.split('/');
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : source;
      } else {
        return source.split('/')[0];
      }
    };

    return {
      ImportDeclaration: (node) => {
        const source = String(node.source.value);
        if (!isEffectPackage(source)) return;
        const basePackage = getBasePackage(source);
        if (shouldSkipEffectPackage(basePackage)) return;

        // If it's a subpath import (e.g., 'effect/Schema'), enforce namespace import except for allowed subpaths.
        if (source.startsWith(basePackage + '/')) {
          const segment = source.slice(basePackage.length + 1);
          const allowsNamed = NAMED_IMPORT_ALLOWED_SUBPATHS.has(segment);
          const isNamespaceOnly =
            node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier';
          if (!allowsNamed && !isNamespaceOnly) {
            context.report({
              node,
              message: 'Use namespace import for Effect subpaths',
            });
          }
          return;
        }

        // From here on, we only handle root package imports like 'effect'.
        const packageName = basePackage;

        // Only process imports with specifiers.
        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }

        // Only process named imports.
        const hasNamedImports = node.specifiers.some((spec) => spec.type === 'ImportSpecifier');

        if (!hasNamedImports) {
          return;
        }

        // Group specifiers by type.
        const typeImports = [];
        const regularImports = [];
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue;
          const entry = { imported: specifier.imported.name, local: specifier.local.name };
          if (specifier.importKind === 'type') typeImports.push(entry);
          else regularImports.push(entry);
        }

        // Partition into resolvable vs unresolved specifiers (resolved entries include segment for fix).
        const resolvedType = [];
        const unresolvedType = [];
        const resolvedRegular = [];
        const unresolvedRegular = [];

        typeImports.forEach((spec) => {
          const segment = resolveExportToSegment(packageName, spec.imported);
          if (segment) resolvedType.push({ ...spec, segment });
          else unresolvedType.push(spec);
        });
        regularImports.forEach((spec) => {
          const segment = resolveExportToSegment(packageName, spec.imported);
          if (segment) resolvedRegular.push({ ...spec, segment });
          else unresolvedRegular.push(spec);
        });

        const unresolved = [...unresolvedType, ...unresolvedRegular].map(({ imported }) => imported);

        // Report and autofix: fix resolvable ones; keep unresolved in a remaining combined import.
        context.report({
          node,
          message:
            unresolved.length > 0
              ? `Use subpath imports for Effect packages; unresolved kept in base import: ${unresolved.join(', ')}`
              : 'Use subpath imports for Effect packages',
          fix: (fixer) => {
            const sourceCode = context.getSourceCode();
            const imports = [];

            // Idempotency guard: if nothing is resolvable, do not rewrite.
            if (resolvedType.length === 0 && resolvedRegular.length === 0) {
              return null;
            }

            // Group resolved imports by segment.
            const bySegment = new Map(); // segment -> { regular: [...], type: [...] }
            resolvedRegular.forEach((entry) => {
              const seg = entry.segment;
              let group = bySegment.get(seg);
              if (!group) {
                group = { regular: [], type: [] };
                bySegment.set(seg, group);
              }
              group.regular.push(entry);
            });
            resolvedType.forEach((entry) => {
              const seg = entry.segment;
              let group = bySegment.get(seg);
              if (!group) {
                group = { regular: [], type: [] };
                bySegment.set(seg, group);
              }
              group.type.push(entry);
            });

            for (const [segment, group] of bySegment) {
              const useNamed = NAMED_IMPORT_ALLOWED_SUBPATHS.has(segment);
              const merged = [...group.regular];
              for (const t of group.type) {
                if (!group.regular.some((r) => r.local === t.local)) merged.push(t);
              }
              if (useNamed && merged.length > 0) {
                const specParts = merged.map(({ imported, local }) =>
                  imported !== local ? `${imported} as ${local}` : imported,
                );
                imports.push(`import { ${specParts.join(', ')} } from '${packageName}/${segment}';`);
              } else {
                const seen = new Set();
                for (const { imported, local } of merged) {
                  const alias = imported !== local ? local : imported;
                  if (seen.has(alias)) continue;
                  seen.add(alias);
                  const isTypeOnly =
                    group.type.some((t) => t.imported === imported) &&
                    !group.regular.some((r) => r.imported === imported);
                  const importStr = isTypeOnly
                    ? `import type * as ${alias} from '${packageName}/${segment}';`
                    : `import * as ${alias} from '${packageName}/${segment}';`;
                  imports.push(importStr);
                }
              }
            }

            // If there are unresolved, keep them in a single base import.
            if (unresolvedType.length || unresolvedRegular.length) {
              // Prefer value over type for the same local alias when both are present.
              const byLocal = new Map(); // local -> { value?: {imported,local}, type?: {imported,local} }
              unresolvedRegular.forEach((s) => {
                const entry = byLocal.get(s.local) ?? {};
                entry.value = s;
                byLocal.set(s.local, entry);
              });
              unresolvedType.forEach((s) => {
                const entry = byLocal.get(s.local) ?? {};
                if (!entry.value) entry.type = s; // only keep type if no value for same local
                byLocal.set(s.local, entry);
              });

              const specParts = [];
              for (const entry of byLocal.values()) {
                if (entry.value) {
                  const { imported, local } = entry.value;
                  const part = imported !== local ? `${imported} as ${local}` : `${imported}`;
                  specParts.push(part);
                } else if (entry.type) {
                  const { imported, local } = entry.type;
                  const part = imported !== local ? `type ${imported} as ${local}` : `type ${imported}`;
                  specParts.push(part);
                }
              }
              if (specParts.length) imports.push(`import { ${specParts.join(', ')} } from '${packageName}';`);
            }

            // Get the original import's indentation.
            const importIndent = sourceCode.text.slice(node.range[0] - node.loc.start.column, node.range[0]);

            // Join imports with newline and proper indentation.
            if (imports.length === 0) return null; // nothing to change
            const newImports = imports.join('\n' + importIndent);

            return fixer.replaceText(node, newImports);
          },
        });
      },
    };
  },
};
