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

type Mod = { source: string; deps: string[] };

// TODO(wittjosiah): There either needs to be a compiler per space or the compiler needs to have multiple environments.
//   Currently module versions are going to trample each other and so only one version can be used globally.
export class Compiler {
  private _env: VirtualTypeScriptEnvironment | undefined;
  private _fsMap: Map<string, string> | undefined;
  private _httpTypeCache: Map<string, string> = new Map();
  private _processedUrls: Set<string> = new Set();
  private _moduleVersions: Map<string, string> = new Map();
  private _packageJsonCache: Map<string, any> = new Map();
  private _debugModuleMap: Record<string, Mod> = {};

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

  get __debugModuleMap() {
    const obj: Record<string, any> = {};

    for (const [fileName, mod] of Object.entries(this._debugModuleMap)) {
      obj[fileName] = {
        source: mod.source,
        rawDeps: mod.deps,
        deps: {},
      };
    }

    for (const [fileName, mod] of Object.entries(this._debugModuleMap)) {
      for (const dep of mod.deps) {
        obj[fileName].deps[dep] = obj[dep];
      }
    }

    return obj;
  }

  __diagnostics() {
    const program = this.environment.languageService.getProgram();
    invariant(program, 'Program not found');
    const emitResult = program.emit();

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        log.info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        log.info(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    });
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
          const moduleName = this._parseImportToUrl(_moduleName, containingFile) ?? _moduleName;
          if (moduleName.startsWith('https://')) {
            const typesUrl = moduleName.endsWith('.d.ts') ? moduleName : this._httpTypeCache.get(moduleName);
            if (typesUrl) {
              return {
                resolvedFileName: typesUrl,
                isExternalLibraryImport: true,
              };
            }
          }

          log('fallback to default resolution', { moduleName, containingFile });

          // Fall back to default resolution.
          const result = ts.resolveModuleName(moduleName, containingFile, this._options, baseSystem);
          return result.resolvedModule;
        });
      },
    };
  }

  private _findImportsInContent(content: string, parseVersions = false): string[] {
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

      if (parseVersions) {
        // Parse version comment at start of file if it exists
        if (ts.isSourceFile(node)) {
          const firstComment = node.getFullText().match(/\/\* @version\n([\s\S]*?)\*\//);
          if (firstComment) {
            try {
              const versions = JSON.parse(firstComment[1]);
              for (const [module, version] of Object.entries(versions)) {
                this._moduleVersions.set(module, version as string);
              }
            } catch (err) {
              log.catch(err);
            }
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

  private _parseImportToUrl(moduleName: string, containingFile?: string): string | undefined {
    if (moduleName.startsWith('http')) {
      return moduleName;
    } else if (moduleName.startsWith('node:')) {
      return `https://esm.sh/@types/node/${moduleName.slice(5)}.d.ts`;
    } else if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
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

      let url = `https://esm.sh/${baseModule}${version ? `@${version}` : ''}${path}`;

      const packageJson = this._packageJsonCache.get(`${baseModule}@${version}`);
      if (packageJson) {
        // Get all dependencies from package.json that have versions specified in moduleVersions
        const deps = Object.keys({ ...(packageJson.dependencies || {}), ...(packageJson.peerDependencies || {}) })
          .filter((dep) => this._moduleVersions.has(dep))
          .map((dep) => `${dep}@${this._moduleVersions.get(dep)}`)
          .join(',');

        if (deps) {
          url += `?deps=${deps}`;
        }
      }

      return url;
    } else if (containingFile?.startsWith('http') && (moduleName.startsWith('.') || moduleName.startsWith('/'))) {
      return new URL(moduleName, containingFile).href;
    }
  }

  private async _processImportsInContent(content: string, fileName?: string): Promise<void> {
    const imports = this._findImportsInContent(content, true);
    log('process imports', { imports, fileName });

    if (fileName) {
      this._debugModuleMap[fileName] = { source: content, deps: [] };
    }

    await Promise.all(
      imports.map(async (importUrl) => {
        let url = this._parseImportToUrl(importUrl);
        if (!url) {
          return;
        }

        // If it's an esm.sh URL, fetch package.json first
        if (url.startsWith('https://esm.sh/')) {
          await this._fetchPackageJson(url);
        }

        // TODO(wittjosiah): Clean this up to parse doesn't need to be called twice.
        // Ensure the deps are included in the URL.
        url = this._parseImportToUrl(importUrl);
        if (!url) {
          return;
        }

        await this._prefetchHttpModule(url, fileName);
      }),
    );
  }

  private async _prefetchHttpModule(url: string, parent?: string): Promise<void> {
    if (this._processedUrls.has(url)) {
      return;
    }

    try {
      this._processedUrls.add(url);
      const response = await fetch(url);
      if (!response.ok) {
        log.error('failed to fetch', { url });
        throw new Error(`Failed to fetch ${url}`);
      }

      const typesUrl = response.headers.get('x-typescript-types');
      const content = await response.text();
      this.setFile(url, content);

      if (typesUrl) {
        if (parent) {
          this._debugModuleMap[parent]?.deps.push(typesUrl);
        }
        this._httpTypeCache.set(url, typesUrl);
        await this._prefetchHttpTypes(typesUrl);
      }
    } catch (err) {
      this._processedUrls.delete(url);
      log.catch(err, { url });
    }
  }

  // TODO(wittjosiah): Reconcile with _parseImportToUrl.
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

    if (parentUrl) {
      this._debugModuleMap[parentUrl] = { source: content, deps: [] };
    }

    await Promise.all(
      imports.map(async (importUrl) => {
        let normalizedUrl = this._normalizeTypesUrl(importUrl, parentUrl);
        if (!normalizedUrl) {
          return;
        }

        if (normalizedUrl.startsWith('https://esm.sh/')) {
          await this._fetchPackageJson(normalizedUrl);
        }

        // TODO(wittjosiah): Clean this up to parse doesn't need to be called twice.
        // Ensure the deps are included in the URL.
        normalizedUrl = this._parseImportToUrl(importUrl, parentUrl);
        if (!normalizedUrl) {
          return;
        }

        if (parentUrl) {
          this._debugModuleMap[parentUrl]?.deps.push(normalizedUrl);
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

  private async _fetchPackageJson(esmUrl: string): Promise<void> {
    // Parse the package name from esm.sh URL
    const urlObj = new URL(esmUrl);
    const [, ...pathParts] = urlObj.pathname.split('/');
    let packageName = pathParts[0];

    // Handle scoped packages
    if (packageName.startsWith('@')) {
      packageName = `${packageName}/${pathParts[1]}`;
    }

    // If we've already cached this package.json, skip
    if (this._packageJsonCache.has(packageName)) {
      return;
    }

    // Skip node and builtin modules
    if (packageName === 'node' || packageName.startsWith('node:')) {
      return;
    }

    try {
      const packageJsonUrl = `https://esm.sh/${packageName}/package.json`;
      const response = await fetch(packageJsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch package.json for ${packageName}`);
      }

      const packageJson = await response.json();
      this._packageJsonCache.set(packageName, packageJson);
      log('cached package.json', { packageName });
    } catch (err) {
      log.catch(err, { packageName });
    }
  }
}
