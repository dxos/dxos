//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { extname, isAbsolute, relative, resolve as resolvePath } from 'node:path';
import { parseSync } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';

import * as Ontology from '../Ontology.ts';

/**
 * Turns one file's source into the JSON-LD document described by `design/ONTOLOGY.md`. Pure apart
 * from the injected resolver, and deliberately ignorant of the store: workers never touch a database.
 */

export type Resolve = (fromFile: string, specifier: string) => string | undefined;

// The AST types come from the parser's own return type: `@oxc-project/types` is also published
// standalone and the two copies are not structurally interchangeable.
type Program = ReturnType<typeof parseSync>['program'];
type Statement = Program['body'][number];
type DefaultExport = Extract<Statement, { type: 'ExportDefaultDeclaration' }>['declaration'];

export type AnalyzeOptions = {
  readonly root: string;
  readonly path: string;
  readonly source: string;
  readonly mtime: number;
  readonly resolve: Resolve;
};

const LANGUAGES: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
};

const PARSED_LANGUAGES = new Set(['typescript', 'javascript']);

export const language = (path: string): string => LANGUAGES[extname(path)] ?? 'other';

/** oxc resolver over the repository, with the extension set the indexer walks. */
export const createResolver = (root: string): Resolve => {
  const factory = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    conditionNames: ['import', 'default'],
  });
  return (fromFile, specifier) => {
    const result = factory.sync(resolvePath(root, fromFile, '..'), specifier);
    return result.path;
  };
};

const lineOf = (source: string, offset: number): number => {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index++) {
    if (source[index] === '\n') {
      line++;
    }
  }
  return line;
};

type Declaration = { name: string; kind: string; exported: boolean; offset: number };

const KINDS: Record<string, string> = {
  FunctionDeclaration: 'function',
  ClassDeclaration: 'class',
  TSTypeAliasDeclaration: 'type',
  TSInterfaceDeclaration: 'interface',
  TSEnumDeclaration: 'enum',
  TSModuleDeclaration: 'namespace',
};

const declarationsOf = (node: Statement | DefaultExport, exported: boolean): Declaration[] => {
  if (node.type === 'VariableDeclaration') {
    return node.declarations.flatMap((declarator) =>
      declarator.id.type === 'Identifier'
        ? [{ name: declarator.id.name, kind: 'variable', exported, offset: declarator.id.start }]
        : [],
    );
  }
  const kind = KINDS[node.type];
  if (!kind) {
    return [];
  }
  // A default-exported function or class may be anonymous, and a TS module declaration's id may be
  // a string literal; the caller names those.
  const id = 'id' in node ? node.id : undefined;
  return id && id.type === 'Identifier' ? [{ name: id.name, kind, exported, offset: id.start }] : [];
};

/** Top-level declarations, with whether each one leaves the module. */
export const declarations = (body: readonly Statement[]): Declaration[] =>
  body.flatMap((node) => {
    switch (node.type) {
      case 'ExportNamedDeclaration':
        return node.declaration ? declarationsOf(node.declaration, true) : [];
      case 'ExportDefaultDeclaration': {
        const named = declarationsOf(node.declaration, true);
        return named.length > 0 ? named : [{ name: 'default', kind: 'variable', exported: true, offset: node.start }];
      }
      default:
        return declarationsOf(node, false);
    }
  });

export const analyze = ({ root, path, source, mtime, resolve }: AnalyzeOptions): Ontology.FileDocument => {
  const fileLanguage = language(path);
  const document: Ontology.FileDocument = {
    '@context': Ontology.CONTEXT,
    '@id': Ontology.fileIri(path).value,
    '@type': 'File',
    path,
    'language': fileLanguage,
    'size': Buffer.byteLength(source),
    mtime,
    'hash': createHash('sha256').update(source).digest('hex'),
    'imports': [],
    'importsModule': [],
    'declares': [],
  };

  if (!PARSED_LANGUAGES.has(fileLanguage)) {
    return document;
  }

  const parsed = parseSync(path, source);
  const errors = parsed.errors.map((error) => error.message);
  const specifiers = new Set([
    ...parsed.module.staticImports.map((entry) => entry.moduleRequest.value),
    ...parsed.module.staticExports.flatMap((entry) =>
      entry.entries.flatMap((exportEntry) => (exportEntry.moduleRequest ? [exportEntry.moduleRequest.value] : [])),
    ),
    ...parsed.module.dynamicImports.flatMap((entry) => {
      const literal = source.slice(entry.moduleRequest.start, entry.moduleRequest.end).replace(/^['"`]|['"`]$/g, '');
      return literal.includes('${') ? [] : [literal];
    }),
  ]);

  const imports: string[] = [];
  const importsModule: string[] = [];
  for (const specifier of specifiers) {
    const resolved = specifier.startsWith('.') || isAbsolute(specifier) ? resolve(path, specifier) : undefined;
    const relativePath = resolved ? relative(root, resolved) : undefined;
    // An import that leaves the repository (or resolves into node_modules) is a module reference,
    // not an edge: the index only holds files it crawled.
    if (relativePath && !relativePath.startsWith('..') && !relativePath.includes('node_modules')) {
      imports.push(Ontology.fileIri(relativePath).value);
    } else {
      importsModule.push(specifier);
    }
  }

  return {
    ...document,
    imports,
    importsModule,
    declares: declarations(parsed.program.body).map((declaration) => ({
      '@id': Ontology.symbolIri(path, declaration.name).value,
      '@type': 'Symbol',
      'name': declaration.name,
      'kind': declaration.kind,
      'exported': declaration.exported,
      'line': lineOf(source, declaration.offset),
    })),
    ...(errors.length > 0 ? { parseError: errors } : {}),
  };
};
