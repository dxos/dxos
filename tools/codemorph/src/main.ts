//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { Project, SyntaxKind } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Node } from 'ts-morph';

// Configuration: packages to enforce namespace imports for.
const PACKAGE_PATTERNS = ['effect', '@effect/'];
const DEFAULT_ALIAS = 'Effect';

const shouldRewriteModule = (moduleSpecifier: string) => {
  if (!moduleSpecifier) return false;
  return PACKAGE_PATTERNS.some(
    (p) => moduleSpecifier === p || moduleSpecifier.startsWith(p) || moduleSpecifier.startsWith(`${p}`),
  );
};

const chooseAlias = (moduleSpecifier: string) => {
  if (moduleSpecifier === 'effect') return 'Effect';
  if (moduleSpecifier.startsWith('@effect/schema')) return 'Schema';
  if (moduleSpecifier.startsWith('@effect/ai-anthropic')) return 'Anthropic';
  if (moduleSpecifier.startsWith('@effect/ai')) return 'AI';
  if (moduleSpecifier.startsWith('@effect')) return 'Effect';
  return DEFAULT_ALIAS;
};

const TYPE_CONTEXT_KINDS = new Set([
  SyntaxKind.TypeReference,
  SyntaxKind.TypeLiteral,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeParameter,
  SyntaxKind.TypePredicate,
  SyntaxKind.IndexSignature,
  SyntaxKind.MappedType,
  SyntaxKind.ArrayType,
  SyntaxKind.TupleType,
  SyntaxKind.TemplateLiteralType,
  SyntaxKind.TypeOperator,
  SyntaxKind.AsExpression, // has a Type child
  SyntaxKind.ImportType,
  SyntaxKind.TypeQuery,
  SyntaxKind.QualifiedName,
]);

const isInTypeContext = (node: Node) => {
  const ancestors = node.getAncestors();
  return ancestors.some((a) => TYPE_CONTEXT_KINDS.has(a.getKind()));
};

const qualifyUsage = (sourceFile: SourceFile, localName: string, alias: string) => {
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  for (const id of identifiers) {
    if (id.getText() !== localName) continue;

    const parent = id.getParent();
    // Skip import/export specifiers and declarations
    if (
      parent?.getKind() === SyntaxKind.ImportSpecifier ||
      parent?.getKind() === SyntaxKind.ImportClause ||
      parent?.getKind() === SyntaxKind.ExportSpecifier ||
      parent?.getKind() === SyntaxKind.ImportEqualsDeclaration ||
      parent?.getKind() === SyntaxKind.ComputedPropertyName
    ) {
      continue;
    }

    // Skip type positions where replacing Identifier with property access would break
    if (isInTypeContext(id)) continue;

    // If already qualified (MemberAccess with alias), skip
    if (
      parent?.getKind() === SyntaxKind.PropertyAccessExpression &&
      (parent as any).getExpression?.().getText() === alias
    ) {
      continue;
    }

    id.replaceWithText(`${alias}.${localName}`);
  }
};

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'out',
  'gen',
  '__swc_snapshots__',
  'vendor',
  'test-results',
]);

const isTsFile = (p: string) => (p.endsWith('.ts') || p.endsWith('.tsx')) && !p.endsWith('.d.ts');

const collectFiles = (root: string): string[] => {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (isTsFile(full)) results.push(full);
      }
    }
  }
  return results;
};

async function run() {
  const here = url.fileURLToPath(import.meta.url);
  const pkgDir = path.resolve(path.dirname(here), '..');
  const repoRoot = path.resolve(pkgDir, '..', '..');

  const allFiles = collectFiles(repoRoot);

  // Process files individually to keep memory usage low
  for (const filePath of allFiles) {
    // Skip complex type usages that are risky to modify automatically (incremental pass)
    const fileText = fs.readFileSync(filePath, 'utf8');
    if (fileText.includes(' satisfies keyof ')) continue;

    const project = new Project({
      tsConfigFilePath: path.join(repoRoot, 'tsconfig.base.json'),
      skipAddingFilesFromTsConfig: true,
    });

    const sourceFile = project.addSourceFileAtPath(filePath);
    let changed = false;

    try {
      for (const importDecl of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (!shouldRewriteModule(moduleSpecifier)) continue;

      // Ignore type-only imports completely
      if (importDecl.isTypeOnly()) continue;

      const named = importDecl.getNamedImports();
      const defaultImport = importDecl.getDefaultImport();
      const namespaceImport = importDecl.getNamespaceImport();

      // If already namespace import, skip
      if (namespaceImport) continue;

      const alias = chooseAlias(moduleSpecifier);

      // Partition specifiers by value vs type-only usage
      const valueNames: string[] = [];
      const typeOnlyNames: string[] = [];
      for (const spec of named) {
        const specName = spec.getName();
        let hasValueUsage = false;
        const ids = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).filter((i) => i.getText() === specName);
        for (const id of ids) {
          const parent = id.getParent();
          if (
            parent?.getKind() === SyntaxKind.ImportSpecifier ||
            parent?.getKind() === SyntaxKind.ImportClause ||
            parent?.getKind() === SyntaxKind.ExportSpecifier ||
            parent?.getKind() === SyntaxKind.ImportEqualsDeclaration
          ) {
            continue;
          }
          if (!isInTypeContext(id) && parent?.getKind() !== SyntaxKind.ComputedPropertyName) {
            hasValueUsage = true;
            break;
          }
        }
        if (hasValueUsage) valueNames.push(specName);
        else typeOnlyNames.push(specName);
      }

      // If there are no value usages and no default import, convert the import to type-only and keep named specifiers
      if (valueNames.length === 0 && !defaultImport) {
        if (!importDecl.isTypeOnly()) importDecl.setIsTypeOnly(true);
        continue;
      }

      // Qualify value usages before changing import
      for (const name of valueNames) {
        qualifyUsage(sourceFile, name, alias);
      }

      // Replace current import with namespace import
      importDecl.removeNamedImports();
      if (defaultImport) importDecl.removeDefaultImport();
      importDecl.setNamespaceImport(alias);

      // Ensure type-only named imports remain for type usages, if any
      if (typeOnlyNames.length > 0) {
        let typeImport = sourceFile
          .getImportDeclarations()
          .find((d) => d.getModuleSpecifierValue() === moduleSpecifier && d.isTypeOnly());
        if (!typeImport) {
          typeImport = sourceFile.addImportDeclaration({ isTypeOnly: true, moduleSpecifier });
        }
        const existing = new Set(typeImport.getNamedImports().map((n) => n.getName()));
        for (const n of typeOnlyNames) {
          if (!existing.has(n)) typeImport.addNamedImport(n);
        }
      }

        changed = true;
      }
    } catch {
      console.warn(`Skipping file due to transform error: ${filePath}`);
    }

    if (changed) {
      sourceFile.fixUnusedIdentifiers();
      await sourceFile.save();
    }

    project.removeSourceFile(sourceFile);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
