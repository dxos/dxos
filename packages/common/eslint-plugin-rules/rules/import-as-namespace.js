//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const DIRECTIVE_TEXT = '@import-as-namespace';
const DIRECTIVE_LINE_REGEX = /^\s*\/\/\s*@import-as-namespace\s*$/m;
const PASCAL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * An import may also prefix the name with a PascalCase qualifier (`ToolkitHooks` for `Hooks`), so two
 * packages' namespaces of the same name can meet in one file.
 */
const isAllowedImportName = (actual, expected) =>
  actual === expected ||
  actual === expected + 'Module' ||
  (actual.length > expected.length &&
    actual.endsWith(expected) &&
    PASCAL_CASE_REGEX.test(actual.slice(0, -expected.length)));
const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/** A package subpath that may name a namespace module: `@dxos/app-toolkit/Hooks`. */
const PACKAGE_SUBPATH_REGEX = /^(@dxos\/[\w-]+)\/([A-Z][a-zA-Z0-9]*)$/;

/** Prefixes for packages whose short name would read badly as one. */
const PACKAGE_PREFIXES = { '@dxos/app-framework': 'App', '@dxos/app-toolkit': 'Toolkit', '@dxos/react-ui': 'Ui' };

/**
 * The qualifier a package's namespaces take when their bare name is taken: the package's short name,
 * PascalCase (`@dxos/plugin-graph` → `Graph`, `@dxos/echo` → `Echo`).
 */
const packagePrefix = (packageName) =>
  PACKAGE_PREFIXES[packageName] ??
  packageName
    .replace(/^@dxos\//, '')
    .replace(/^plugin-/, '')
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');

/** Globals a namespace import must not shadow. */
const GLOBAL_NAMES = new Set([
  'Array',
  'Blob',
  'Boolean',
  'Date',
  'Document',
  'Element',
  'Error',
  'Event',
  'File',
  'Function',
  'Headers',
  'History',
  'Image',
  'Intl',
  'JSON',
  'Location',
  'Map',
  'Math',
  'Node',
  'Notification',
  'Number',
  'Object',
  'Option',
  'Promise',
  'Proxy',
  'Range',
  'Record',
  'Reflect',
  'Request',
  'Response',
  'Selection',
  'Set',
  'Storage',
  'String',
  'Symbol',
  'Text',
  'URL',
  'Window',
  'Worker',
]);

/** Every name the file declares or imports, counted, at any depth. */
const collectDeclaredNames = (ast) => {
  const counts = new Map();
  const add = (name) => name && counts.set(name, (counts.get(name) ?? 0) + 1);
  const addPattern = (pattern) => {
    if (!pattern) {
      return;
    }
    switch (pattern.type) {
      case 'Identifier':
        add(pattern.name);
        break;
      case 'ObjectPattern':
        pattern.properties.forEach((property) =>
          addPattern(property.type === 'RestElement' ? property : property.value),
        );
        break;
      case 'ArrayPattern':
        pattern.elements.forEach(addPattern);
        break;
      case 'AssignmentPattern':
        addPattern(pattern.left);
        break;
      case 'RestElement':
        addPattern(pattern.argument);
        break;
      case 'TSParameterProperty':
        addPattern(pattern.parameter);
        break;
    }
  };
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') {
      return;
    }
    switch (node.type) {
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
        add(node.local.name);
        break;
      case 'VariableDeclarator':
        addPattern(node.id);
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        if (node.type === 'FunctionDeclaration') {
          add(node.id?.name);
        }
        node.params.forEach(addPattern);
        break;
      case 'ClassDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration':
      case 'TSEnumDeclaration':
        add(node.id?.name);
        break;
      case 'TSModuleDeclaration':
        if (node.id?.type === 'Identifier') {
          add(node.id.name);
        }
        break;
      case 'CatchClause':
        addPattern(node.param);
        break;
      case 'TSTypeParameter':
        add(typeof node.name === 'string' ? node.name : node.name?.name);
        break;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'loc' || key === 'range') {
        continue;
      }
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else if (child && typeof child === 'object') {
        visit(child);
      }
    }
  };
  visit(ast);
  return counts;
};

/**
 * ESLint rule to enforce namespace imports for modules annotated with `// @import-as-namespace`.
 *
 * When a module contains the `// @import-as-namespace` directive comment, this rule enforces:
 * - The module filename is PascalCase (e.g. `LanguageModel.ts`).
 * - All imports of the module use namespace form: `import * as LanguageModel from './LanguageModel'`.
 * - The namespace name matches the filename (without extension), has a `Module` suffix, or (on
 *   imports) a PascalCase prefix.
 * - A namespace module reached through a package subpath (`@dxos/app-toolkit/Hooks`) is imported as
 *   its own name, or, when the file already binds that name or it is a global, as the package's
 *   short name plus its name: `import * as ToolkitHooks from '@dxos/app-toolkit/Hooks'`.
 * - Re-exports use namespace form: `export * as LanguageModel from './LanguageModel'`.
 *
 * The `Module` suffix is allowed as an escape hatch when the expected namespace name conflicts
 * with a local declaration in the importing file (e.g., `import * as ObjModule from './Obj'`
 * when the file also exports its own `Obj` interface).
 *
 * @example
 * // In LanguageModel.ts:
 * // @import-as-namespace
 * export const foo = 1;
 *
 * // ❌ Bad (in another file):
 * import { foo } from './LanguageModel';
 * export { foo } from './LanguageModel';
 * export * from './LanguageModel';
 *
 * // ✅ Good:
 * import * as LanguageModel from './LanguageModel';
 * import * as LanguageModelModule from './LanguageModel';  // Also allowed when needed
 * export * as LanguageModel from './LanguageModel';
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce namespace imports for modules marked with @import-as-namespace',
    },
    fixable: 'code',
    schema: [],
    messages: {
      filenameMustBePascalCase:
        'Module marked with @import-as-namespace must have a PascalCase filename. Got: "{{filename}}".',
      mustUseNamespaceImport:
        'Module "{{source}}" is marked @import-as-namespace. Use: `import * as {{namespace}} from \'{{source}}\'`.',
      namespaceMustMatchFilename: 'Namespace import name "{{actual}}" must match filename "{{expected}}".',
      packageNamespaceAlias:
        'Import "{{source}}" as `{{expected}}`: a namespace import takes its own name, and the package prefix only when the file already binds `{{name}}`.',
      mustUseNamespaceReexport:
        'Module "{{source}}" is marked @import-as-namespace. Use: `export * as {{namespace}} from \'{{source}}\'`.',
    },
  },
  create: (context) => {
    const directiveCache = new Map();
    const requireForFile = createRequire(context.filename ?? context.getFilename());
    const packageCache = new Map();
    let declaredNames = null;
    const isTaken = (name, ownLocal) =>
      GLOBAL_NAMES.has(name) ||
      ((declaredNames ??= collectDeclaredNames(context.sourceCode.ast)).get(name) ?? 0) > (ownLocal === name ? 1 : 0);

    /** The source file behind `<package>/<Name>`, when it is a namespace module. */
    const resolvePackageNamespace = (packageName, name) => {
      let manifest = packageCache.get(packageName);
      if (manifest === undefined) {
        try {
          const manifestPath = requireForFile.resolve(`${packageName}/package.json`);
          manifest = {
            dir: path.dirname(manifestPath),
            exports: JSON.parse(fs.readFileSync(manifestPath, 'utf8')).exports,
          };
        } catch {
          manifest = null;
        }
        packageCache.set(packageName, manifest);
      }
      const entry = manifest?.exports?.[`./${name}`];
      const source = entry && typeof entry === 'object' ? entry.source : null;
      if (typeof source !== 'string') {
        return null;
      }
      const filePath = path.join(manifest.dir, source);
      return fileHasDirective(filePath) ? filePath : null;
    };

    const fileHasDirective = (filePath) => {
      if (directiveCache.has(filePath)) {
        return directiveCache.get(filePath);
      }
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = DIRECTIVE_LINE_REGEX.test(content);
        directiveCache.set(filePath, result);
        return result;
      } catch {
        directiveCache.set(filePath, false);
        return false;
      }
    };

    const resolveRelativeImport = (source, currentFile) => {
      if (!source.startsWith('.')) {
        return null;
      }
      const dir = path.dirname(currentFile);
      const resolved = path.resolve(dir, source);
      // The specifier may already carry its extension (`./types/index.ts`) — resolve it directly
      // rather than appending another one on top, which would never exist on disk.
      if (TS_EXTENSIONS.some((ext) => resolved.endsWith(ext))) {
        return fs.existsSync(resolved) ? resolved : null;
      }
      for (const ext of TS_EXTENSIONS) {
        const filePath = resolved + ext;
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
      for (const ext of TS_EXTENSIONS) {
        const filePath = path.join(resolved, 'index' + ext);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
      return null;
    };

    const namespaceFromSource = (source) => {
      // A directory barrel's extensioned form (`./Foo/index.ts`) names the same target the bare
      // `./Foo` did before `rewriteRelativeImportExtensions` — strip the trailing index file so the
      // namespace derives from the directory, not the literal file.
      const withoutIndex = source.replace(/\/index\.\w+$/, '');
      const parts = withoutIndex.split('/');
      const last = parts[parts.length - 1];
      return last.replace(/\.\w+$/, '');
    };

    const buildImportFix = (fixer, node, source, expectedNamespace, context) => {
      const fixes = [];
      const importKeyword = node.importKind === 'type' ? 'import type' : 'import';
      fixes.push(fixer.replaceText(node, `${importKeyword} * as ${expectedNamespace} from '${source}';`));

      try {
        const importedName = new Map(
          node.specifiers
            .filter((specifier) => specifier.type === 'ImportSpecifier')
            .map((specifier) => [specifier.local.name, specifier.imported.name ?? specifier.imported.value]),
        );
        const declaredVars = context.sourceCode.getDeclaredVariables(node);
        for (const variable of declaredVars) {
          for (const ref of variable.references) {
            if (ref.identifier.range[0] >= node.range[0] && ref.identifier.range[1] <= node.range[1]) {
              continue;
            }
            const member = `${expectedNamespace}.${importedName.get(variable.name) ?? variable.name}`;
            const parent = ref.identifier.parent;
            const shorthand = parent?.type === 'Property' && parent.shorthand && parent.value === ref.identifier;
            fixes.push(fixer.replaceText(ref.identifier, shorthand ? `${variable.name}: ${member}` : member));
          }
        }
      } catch {
        // Scope analysis unavailable; fix import declaration only.
      }

      return fixes;
    };

    return {
      Program: (node) => {
        const comments = context.sourceCode.getAllComments();
        const hasDirective = comments.some(
          (comment) => comment.type === 'Line' && comment.value.trim() === DIRECTIVE_TEXT,
        );
        if (!hasDirective) {
          return;
        }
        const filename = path.basename(context.filename ?? context.getFilename());
        const stem = filename.replace(/\.\w+$/, '');
        if (!PASCAL_CASE_REGEX.test(stem)) {
          context.report({
            node,
            messageId: 'filenameMustBePascalCase',
            data: { filename },
          });
        }
      },

      ImportDeclaration: (node) => {
        const source = String(node.source.value);
        if (!node.specifiers || node.specifiers.length === 0) {
          return;
        }
        const packageMatch = source.match(PACKAGE_SUBPATH_REGEX);
        if (packageMatch) {
          const [, packageName, name] = packageMatch;
          if (!resolvePackageNamespace(packageName, name)) {
            return;
          }
          const namespaceSpecifier =
            node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier'
              ? node.specifiers[0]
              : null;
          const actual = namespaceSpecifier?.local.name;
          const expected = isTaken(name, actual) ? packagePrefix(packageName) + name : name;
          if (!namespaceSpecifier) {
            context.report({
              node,
              messageId: 'mustUseNamespaceImport',
              data: { source, namespace: expected },
              fix: (fixer) => buildImportFix(fixer, node, source, expected, context),
            });
          } else if (actual !== expected) {
            context.report({
              node,
              messageId: 'packageNamespaceAlias',
              data: { source, expected, name },
              fix: (fixer) => {
                const fixes = [fixer.replaceText(namespaceSpecifier.local, expected)];
                for (const variable of context.sourceCode.getDeclaredVariables(node)) {
                  for (const ref of variable.references) {
                    fixes.push(fixer.replaceText(ref.identifier, expected));
                  }
                }
                return fixes;
              },
            });
          }
          return;
        }
        if (!source.startsWith('.')) {
          return;
        }

        const currentFile = context.filename ?? context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);

        const isNamespaceImport =
          node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier';

        if (!isNamespaceImport) {
          context.report({
            node,
            messageId: 'mustUseNamespaceImport',
            data: { source, namespace: expectedNamespace },
            fix: (fixer) => buildImportFix(fixer, node, source, expectedNamespace, context),
          });
          return;
        }

        const actual = node.specifiers[0].local.name;
        if (!isAllowedImportName(actual, expectedNamespace)) {
          context.report({
            node,
            messageId: 'namespaceMustMatchFilename',
            data: { actual, expected: expectedNamespace },
            fix: (fixer) => {
              const importKeyword = node.importKind === 'type' ? 'import type' : 'import';
              return fixer.replaceText(node, `${importKeyword} * as ${expectedNamespace} from '${source}';`);
            },
          });
        }
      },

      ExportNamedDeclaration: (node) => {
        if (!node.source) {
          return;
        }
        const source = String(node.source.value);
        if (!source.startsWith('.')) {
          return;
        }

        const currentFile = context.filename ?? context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);
        const exportKeyword = node.exportKind === 'type' ? 'export type' : 'export';
        context.report({
          node,
          messageId: 'mustUseNamespaceReexport',
          data: { source, namespace: expectedNamespace },
          fix: (fixer) => {
            return fixer.replaceText(node, `${exportKeyword} * as ${expectedNamespace} from '${source}';`);
          },
        });
      },

      ExportAllDeclaration: (node) => {
        if (!node.source) {
          return;
        }
        const source = String(node.source.value);
        if (!source.startsWith('.')) {
          return;
        }

        const currentFile = context.filename ?? context.getFilename();
        const resolved = resolveRelativeImport(source, currentFile);
        if (!resolved) {
          return;
        }
        if (!fileHasDirective(resolved)) {
          return;
        }

        const expectedNamespace = namespaceFromSource(source);

        if (node.exported) {
          const actual = node.exported.name;
          const allowedNames = [expectedNamespace, expectedNamespace + 'Module'];
          if (!allowedNames.includes(actual)) {
            context.report({
              node,
              messageId: 'namespaceMustMatchFilename',
              data: { actual, expected: expectedNamespace },
              fix: (fixer) => {
                return fixer.replaceText(node, `export * as ${expectedNamespace} from '${source}';`);
              },
            });
          }
          return;
        }

        context.report({
          node,
          messageId: 'mustUseNamespaceReexport',
          data: { source, namespace: expectedNamespace },
          fix: (fixer) => {
            return fixer.replaceText(node, `export * as ${expectedNamespace} from '${source}';`);
          },
        });
      },
    };
  },
};
