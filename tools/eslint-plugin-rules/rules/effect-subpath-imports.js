//
// Copyright 2025 DXOS.org
//

import { createRequire } from 'node:module';

/**
 * ESLint rule to transform combined imports from 'effect' into subpath imports.
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

    const isEffectPackage = (source) => {
      return source === 'effect' || source.startsWith('effect/') || source.startsWith('@effect/');
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

        // If it's a subpath import (e.g., 'effect/Schema'), enforce namespace import only.
        if (source.startsWith(basePackage + '/')) {
          const isNamespaceOnly =
            node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier';
          if (!isNamespaceOnly) {
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

        // Partition into resolvable vs unresolved specifiers.
        const resolvedType = [];
        const unresolvedType = [];
        const resolvedRegular = [];
        const unresolvedRegular = [];

        typeImports.forEach((s) =>
          isValidSubpath(packageName, s.imported) ? resolvedType.push(s) : unresolvedType.push(s),
        );
        regularImports.forEach((s) =>
          isValidSubpath(packageName, s.imported) ? resolvedRegular.push(s) : unresolvedRegular.push(s),
        );

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

            // Prefer regular (value) imports over type imports on duplicates.
            const seenResolved = new Set(); // key: `${alias}|${segment}`

            // First, emit value imports and record keys.
            resolvedRegular.forEach(({ imported, local }) => {
              const alias = imported !== local ? local : imported;
              const key = `${alias}|${imported}`;
              if (seenResolved.has(key)) return;
              seenResolved.add(key);
              imports.push(`import * as ${alias} from '${packageName}/${imported}';`);
            });

            // Then, emit type imports only if a value import for the same alias/segment was not emitted.
            resolvedType.forEach(({ imported, local }) => {
              const alias = imported !== local ? local : imported;
              const key = `${alias}|${imported}`;
              if (seenResolved.has(key)) return; // skip type if value exists
              seenResolved.add(key);
              imports.push(`import type * as ${alias} from '${packageName}/${imported}';`);
            });

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
