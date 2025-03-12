//
// Copyright 2024 DXOS.org
//

import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts from 'typescript';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

const GLOBALS = 'globals.d.ts';

const defaultOptions: ts.CompilerOptions = {
  allowJs: true,
  declaration: true,
  declarationMap: true,
  esModuleInterop: true,
  lib: ['DOM', 'es2022'],
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.Preserve,
  isolatedModules: true,
  skipLibCheck: true,
  strict: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES2022,
};

export class Compiler {
  private _env: VirtualTypeScriptEnvironment | undefined;
  private _fsMap: Map<string, string> | undefined;
  private _httpTypeCache: Map<string, string> = new Map();
  private _processedUrls: Set<string> = new Set();
  private _moduleVersions: Map<string, string> = new Map();

  constructor(private readonly _options: ts.CompilerOptions = defaultOptions) {}

  async initialize(globals?: string) {
    if (this._env) {
      return;
    }

    // TODO(wittjosiah): Figure out how to get workers working in plugin packages.
    //   https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
    this._fsMap = await createDefaultMapFromCDN(this._options, '5.7.2', true, ts);

    if (globals) {
      this._fsMap.set(GLOBALS, globals);
      await this._processImportsInContent(globals, GLOBALS);
    }

    const rootFiles = globals ? [GLOBALS] : [];
    const system = this._createCustomSystem();
    this._env = createVirtualTypeScriptEnvironment(system, rootFiles, ts, this._options);
  }

  get environment() {
    invariant(this._env, 'Compiler environment not initialized.');
    return this._env;
  }

  setFile(fileName: string, content: string) {
    log('set file', { fileName });
    if (this._env) {
      this._env.createFile(fileName, content);
      return;
    }
    invariant(this._fsMap, 'File system map not initialized.');
    this._fsMap.set(fileName, content);
  }

  compile(fileName: string) {
    return this.environment.languageService.getEmitOutput(fileName);
  }

  // TODO(wittjosiah): Use text from source file?
  async processImports(fileName: string, content: string) {
    const sourceFile = this.environment.languageService.getProgram()?.getSourceFile(fileName);
    if (!sourceFile) {
      this.setFile(fileName, content);
    }

    await this._processImportsInContent(content, fileName);
  }

  private _createCustomSystem() {
    invariant(this._fsMap, 'File system map not initialized.');
    const baseSystem = createSystem(this._fsMap);
    const getFile = (path: string) => this._fsMap?.get(path) ?? '';
    const hasFile = (path: string) => this._fsMap?.has(path) ?? false;

    return {
      ...baseSystem,
      readFile: (path: string) => {
        const file = path.startsWith('https://') ? getFile(path) : baseSystem.readFile(path);
        log('read file', { path });
        return file;
      },
      fileExists: (path: string) => {
        const exists = path.startsWith('https://') ? hasFile(path) : baseSystem.fileExists(path);
        log('file exists', { path, exists });
        return exists;
      },
      resolveModuleNames: (moduleNames: string[], containingFile: string) => {
        return moduleNames.map((_moduleName) => {
          const moduleName = this._parseImportToUrl(_moduleName) ?? _moduleName;
          if (moduleName.startsWith('https://')) {
            const typesUrl = moduleName.endsWith('.d.ts') ? moduleName : this._httpTypeCache.get(moduleName);
            if (typesUrl) {
              return {
                resolvedFileName: typesUrl,
                isExternalLibraryImport: true,
              };
            }
          }

          // Fall back to default resolution.
          const result = ts.resolveModuleName(moduleName, containingFile, this._options, baseSystem);
          return result.resolvedModule;
        });
      },
    };
  }

  private _findImportsInContent(content: string): string[] {
    const imports: Set<string> = new Set();
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.add(moduleSpecifier.text);
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          imports.add(node.moduleSpecifier.text);
        }
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          imports.add(argument.text);
        }
      } else if (ts.isImportTypeNode(node)) {
        const argument = node.argument;
        if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
          imports.add(argument.literal.text);
        }
      }

      // Check for version comments before imports
      if (ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && node.moduleSpecifier)) {
        const sourceFile = node.getSourceFile();
        const start = node.getStart();
        const lineStart = ts.getLineAndCharacterOfPosition(sourceFile, start).line;
        if (lineStart > 0) {
          const prevLineStart = ts.getPositionOfLineAndCharacter(sourceFile, lineStart - 1, 0);
          const prevLineEnd = ts.getPositionOfLineAndCharacter(sourceFile, lineStart, 0);
          const prevLine = sourceFile.text.substring(prevLineStart, prevLineEnd).trim();

          const versionMatch = prevLine.match(/\/\/\s*@version\s+([^\s]+)/);
          if (versionMatch) {
            const moduleName = ts.isImportDeclaration(node)
              ? (node.moduleSpecifier as ts.StringLiteral).text
              : (node.moduleSpecifier as ts.StringLiteral).text;
            this._moduleVersions.set(moduleName, versionMatch[1]);
          }
        }
      }

      // Recursively visit all children
      ts.forEachChild(node, visit);
    };

    const sourceFile = ts.createSourceFile('temp.ts', content, this._options.target ?? ts.ScriptTarget.Latest, true);
    visit(sourceFile);
    return Array.from(imports);
  }

  private _parseImportToUrl(moduleName: string): string | undefined {
    if (!moduleName.startsWith('.')) {
      const version = this._moduleVersions.get(moduleName);
      const parts = moduleName.split('/');
      let baseModule, path;
      if (parts[0].startsWith('@')) {
        baseModule = parts.slice(0, 2).join('/');
        path = parts.slice(2).length > 0 ? '/' + parts.slice(2).join('/') : '';
      } else {
        baseModule = parts[0];
        path = parts.slice(1).length > 0 ? '/' + parts.slice(1).join('/') : '';
      }
      const url = `https://esm.sh/${baseModule}${version ? `@${version}` : ''}${path}`;
      return url;
    }
  }

  private async _processImportsInContent(content: string, fileName?: string): Promise<void> {
    const imports = this._findImportsInContent(content);
    log('process imports', { imports, fileName });

    await Promise.all(
      imports.map(async (importUrl) => {
        const url = this._parseImportToUrl(importUrl);
        if (!url) {
          return;
        }

        await this._prefetchHttpModule(url);
      }),
    );
  }

  private async _prefetchHttpModule(url: string): Promise<void> {
    if (this._processedUrls.has(url)) {
      return;
    }

    try {
      this._processedUrls.add(url);
      const response = await fetch(url);
      invariant(response.ok);
      const typesUrl = response.headers.get('x-typescript-types');
      const content = await response.text();
      this.setFile(url, content);

      if (typesUrl) {
        this._httpTypeCache.set(url, typesUrl);
        await this._prefetchHttpTypes(typesUrl);
      }
    } catch (err) {
      this._processedUrls.delete(url);
      log.catch(err, { url });
    }
  }

  private _normalizeTypesUrl(url: string, parent?: string): string | undefined {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (!parent || url.startsWith('node:')) {
      return;
    }

    const parentUrl = new URL(parent);
    if (url.startsWith('/')) {
      // Absolute path - use parent's origin.
      return new URL(url, parentUrl.origin).href;
    } else {
      // Relative path - resolve against parent's full URL.
      return new URL(url, parentUrl).href;
    }
  }

  private async _processImportsInTypeDefinition(content: string, parentUrl?: string): Promise<void> {
    const imports = this._findImportsInContent(content);
    log('process imports', { parentUrl, imports });

    await Promise.all(
      imports.map(async (importUrl) => {
        const normalizedUrl = this._normalizeTypesUrl(importUrl, parentUrl);
        if (!normalizedUrl) {
          return;
        }

        await this._prefetchHttpTypes(normalizedUrl);
      }),
    );
  }

  private async _prefetchHttpTypes(url: string): Promise<void> {
    if (this._processedUrls.has(url)) {
      return;
    }

    try {
      this._processedUrls.add(url);
      const response = await fetch(url);
      invariant(response.ok);
      const content = await response.text();
      this.setFile(url, content);

      await this._processImportsInTypeDefinition(content, url);
    } catch (err) {
      this._processedUrls.delete(url);
      log.catch(err, { url });
    }
  }
}
