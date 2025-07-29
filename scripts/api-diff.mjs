#!/usr/bin/env node

import { $, cd, chalk, fs, path } from 'zx';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TypeScript compiler API
const ts = require('typescript');

/**
 * API Diff Tool
 * Analyze and compare public TypeScript APIs for npm packages
 *
 * Usage:
 *   node api-diff.mjs <package-name> <version>                    # Print all public APIs
 *   node api-diff.mjs <package-name> <version> --changes <old-version>  # Print API changes
 *
 * Examples:
 *   node api-diff.mjs @dxos/echo-db 0.8.3
 *   node api-diff.mjs @dxos/echo-db 0.8.3 --changes 0.7.4
 */

$.verbose = false;

const VERBOSE = false,
  DEBUG = true;

process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Error: '), err);
  process.exit(1);
});

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(chalk.red('Usage:'));
    console.error(
      chalk.yellow('  node api-diff.mjs <package-name> <version>                    # Print all public APIs'),
    );
    console.error(
      chalk.yellow('  node api-diff.mjs <package-name> <version> --changes <old-version>  # Print API changes'),
    );
    console.error(chalk.yellow('Examples:'));
    console.error(chalk.yellow('  node api-diff.mjs @dxos/echo-db 0.8.3'));
    console.error(chalk.yellow('  node api-diff.mjs @dxos/echo-db 0.8.3 --changes 0.7.4'));
    process.exit(1);
  }

  const [packageName, newVersion] = args;

  // Check for --changes flag
  const changesIndex = args.indexOf('--changes');
  if (changesIndex !== -1) {
    if (changesIndex + 1 >= args.length) {
      console.error(chalk.red('Error: --changes flag requires an old version'));
      process.exit(1);
    }
    const oldVersion = args[changesIndex + 1];
    return { packageName, newVersion, oldVersion, mode: 'diff' };
  }

  return { packageName, newVersion, mode: 'print' };
}

/**
 * Download and extract npm package to temporary directory
 */
async function downloadPackage(packageName, version) {
  const tmpDir = await fs.mkdtemp(path.join('/tmp', 'api-diff-'));
  const packageSpec = `${packageName}@${version}`;

  VERBOSE && console.error(chalk.blue(`Downloading ${packageSpec}...`));

  try {
    await $({ stdio: 'ignore' })`cd ${tmpDir} && npm pack ${packageSpec}`;

    // Find the downloaded tarball
    const files = await fs.readdir(tmpDir);
    const tarball = files.find((f) => f.endsWith('.tgz'));

    if (!tarball) {
      throw new Error(`No tarball found for ${packageSpec}`);
    }

    // Extract tarball
    await $({ stdio: 'ignore' })`cd ${tmpDir} && tar -xzf ${tarball}`;

    return path.join(tmpDir, 'package');
  } catch (error) {
    console.error(chalk.red(`Failed to download ${packageSpec}:`), error);
    throw error;
  }
}

/**
 * Find TypeScript declaration files and entry points
 */
async function findTypeDefinitions(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(`package.json not found in ${packageDir}`);
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const entryPoints = [];

  // Main entry point
  if (packageJson.types || packageJson.typings) {
    entryPoints.push({
      name: 'main',
      path: path.resolve(packageDir, packageJson.types || packageJson.typings),
    });
  }

  // Exports field
  if (packageJson.exports) {
    for (const [exportName, exportValue] of Object.entries(packageJson.exports)) {
      if (typeof exportValue === 'object' && exportValue.types) {
        entryPoints.push({
          name: exportName === '.' ? 'main' : exportName,
          path: path.resolve(packageDir, exportValue.types),
        });
      }
    }
  }

  // If no types found, look for common patterns
  if (entryPoints.length === 0) {
    const commonPaths = ['index.d.ts', 'dist/index.d.ts', 'lib/index.d.ts', 'types/index.d.ts'];

    for (const commonPath of commonPaths) {
      const fullPath = path.join(packageDir, commonPath);
      if (await fs.pathExists(fullPath)) {
        entryPoints.push({
          name: 'main',
          path: fullPath,
        });
        break;
      }
    }
  }

  return entryPoints;
}

/**
 * Extract public API exports from TypeScript files
 */
function extractPublicAPI(entryPoints) {
  const exports = new Map();

  for (const entryPoint of entryPoints) {
    if (!fs.existsSync(entryPoint.path)) {
      console.error(chalk.yellow(`Warning: Type definition file not found: ${entryPoint.path}`));
      continue;
    }

    const program = ts.createProgram([entryPoint.path], {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      declaration: true,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    });

    const sourceFile = program.getSourceFile(entryPoint.path);
    if (!sourceFile) continue;

    const checker = program.getTypeChecker();

    // Process direct exports from the module symbol
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol && moduleSymbol.exports) {
      moduleSymbol.exports.forEach((symbol, name) => {
        DEBUG && console.error({ name, symbol });
        if (name === 'default') return; // Skip default exports for now

        const declaration = symbol.valueDeclaration || symbol.declarations?.[0];
        if (!declaration) return;

        // Only include public exports (not internal)
        if (name.startsWith('_')) return;

        const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
        const typeString = checker.typeToString(type, declaration, ts.TypeFormatFlags.InTypeAlias);

        exports.set(name, {
          name,
          entryPoint: entryPoint.name,
          declaration,
          type: typeString,
          kind: ts.SyntaxKind[declaration.kind],
          sourceText: getDeclarationText(declaration, sourceFile),
        });
      });
    }

    // Process export * from statements
    processExportStarStatements(sourceFile, checker, exports, entryPoint);
  }

  return exports;
}

/**
 * Process export * from statements to capture re-exported symbols
 */
function processExportStarStatements(sourceFile, checker, exports, entryPoint) {
  function visit(node) {
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.exportClause) {
      // This is an "export * from 'module'" statement
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
        if (moduleSymbol && moduleSymbol.exports) {
          moduleSymbol.exports.forEach((symbol, name) => {
            if (name === 'default') return; // Skip default exports
            if (name.startsWith('_')) return; // Skip internal exports
            if (exports.has(name)) return; // Don't override existing exports

            const declaration = symbol.valueDeclaration || symbol.declarations?.[0];
            if (!declaration) return;

            try {
              const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
              const typeString = checker.typeToString(type, declaration, ts.TypeFormatFlags.InTypeAlias);

              // For re-exported symbols, we need to get the source file of the original declaration
              const originalSourceFile = declaration.getSourceFile();
              
              exports.set(name, {
                name,
                entryPoint: entryPoint.name,
                declaration,
                type: typeString,
                kind: ts.SyntaxKind[declaration.kind],
                sourceText: getDeclarationText(declaration, originalSourceFile),
                isReExport: true,
                reExportFrom: moduleSpecifier.text,
              });
            } catch (error) {
              DEBUG && console.error(`Error processing re-export ${name}:`, error.message);
            }
          });
        }
      }
    }
    
    // Also handle named re-exports: export { foo, bar } from 'module'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
        if (moduleSymbol && moduleSymbol.exports) {
          node.exportClause.elements.forEach(exportSpecifier => {
            const exportedName = exportSpecifier.name.text;
            const originalName = exportSpecifier.propertyName?.text || exportedName;
            
            const symbol = moduleSymbol.exports?.get(originalName);
            if (!symbol) return;
            
            if (exportedName.startsWith('_')) return; // Skip internal exports
            if (exports.has(exportedName)) return; // Don't override existing exports

            const declaration = symbol.valueDeclaration || symbol.declarations?.[0];
            if (!declaration) return;

            try {
              const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
              const typeString = checker.typeToString(type, declaration, ts.TypeFormatFlags.InTypeAlias);
              const originalSourceFile = declaration.getSourceFile();
              
              exports.set(exportedName, {
                name: exportedName,
                entryPoint: entryPoint.name,
                declaration,
                type: typeString,
                kind: ts.SyntaxKind[declaration.kind],
                sourceText: getDeclarationText(declaration, originalSourceFile),
                isReExport: true,
                reExportFrom: moduleSpecifier.text,
                originalName: originalName !== exportedName ? originalName : undefined,
              });
            } catch (error) {
              DEBUG && console.error(`Error processing named re-export ${exportedName}:`, error.message);
            }
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * Get the full text of a declaration
 */
function getDeclarationText(declaration, sourceFile) {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  return printer.printNode(ts.EmitHint.Unspecified, declaration, sourceFile);
}

/**
 * Compare two API maps and generate diff
 */
function compareAPIs(oldAPI, newAPI) {
  const changes = {
    added: [],
    changed: [],
    removed: [],
  };

  // Find added and changed
  for (const [name, newExport] of newAPI) {
    const oldExport = oldAPI.get(name);

    if (!oldExport) {
      changes.added.push(newExport);
    } else if (oldExport.sourceText !== newExport.sourceText) {
      changes.changed.push({
        name,
        old: oldExport,
        new: newExport,
      });
    }
  }

  // Find removed
  for (const [name, oldExport] of oldAPI) {
    if (!newAPI.has(name)) {
      changes.removed.push(oldExport);
    }
  }

  // Sort all changes by name
  changes.added.sort((a, b) => a.name.localeCompare(b.name));
  changes.changed.sort((a, b) => a.name.localeCompare(b.name));
  changes.removed.sort((a, b) => a.name.localeCompare(b.name));

  return changes;
}

/**
 * Output all public APIs in markdown format
 */
function outputAllAPIs(packageName, version, api) {
  console.log(`# Public API: ${packageName}@${version}\n`);

  if (api.size === 0) {
    console.log('No public API exports found.\n');
    return;
  }

  console.log(`**Total exports:** ${api.size}\n`);

  // Sort exports by name
  const sortedExports = Array.from(api.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const export_ of sortedExports) {
    console.log(`## ${export_.name}\n`);
    console.log('```typescript');
    console.log(export_.sourceText);
    console.log('```\n');
  }
}

/**
 * Output changes in markdown format
 */
function outputChanges(packageName, oldVersion, newVersion, changes) {
  console.log(`# API Changes: ${packageName} ${oldVersion} → ${newVersion}\n`);

  const totalChanges = changes.added.length + changes.changed.length + changes.removed.length;

  if (totalChanges === 0) {
    console.log('No API changes detected.\n');
    return;
  }

  console.log(
    `**Summary:** ${changes.added.length} added, ${changes.changed.length} changed, ${changes.removed.length} removed\n`,
  );

  // Added exports
  if (changes.added.length > 0) {
    console.log('## ✅ Added\n');
    for (const export_ of changes.added) {
      console.log(`### ${export_.name}\n`);
      console.log('```typescript');
      console.log(export_.sourceText);
      console.log('```\n');
    }
  }

  // Changed exports
  if (changes.changed.length > 0) {
    console.log('## 🔄 Changed\n');
    for (const change of changes.changed) {
      console.log(`### ${change.name}\n`);
      console.log('```typescript');
      console.log(change.new.sourceText);
      console.log('```\n');
    }
  }

  // Removed exports
  if (changes.removed.length > 0) {
    console.log('## ❌ Removed\n');
    for (const export_ of changes.removed) {
      console.log(`- \`${export_.name}\`\n`);
    }
  }
}

/**
 * Cleanup temporary directories
 */
async function cleanup(dirs) {
  if (DEBUG) return;
  for (const dir of dirs) {
    try {
      await fs.remove(path.dirname(dir));
    } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to cleanup ${dir}`), error);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const { packageName, newVersion, oldVersion, mode } = parseArgs();

  let oldPackageDir, newPackageDir;

  try {
    if (mode === 'print') {
      // Print all APIs for a single version
      newPackageDir = await downloadPackage(packageName, newVersion);

      VERBOSE && console.error(chalk.blue('Analyzing type definitions...'));
      const entryPoints = await findTypeDefinitions(newPackageDir);

      if (entryPoints.length === 0) {
        throw new Error(`No TypeScript definitions found for ${packageName}@${newVersion}`);
      }

      DEBUG && console.error({ entryPoints });

      VERBOSE && console.error(chalk.blue('Extracting public APIs...'));
      const api = extractPublicAPI(entryPoints);

      outputAllAPIs(packageName, newVersion, api);
    } else if (mode === 'diff') {
      // Compare two versions
      [oldPackageDir, newPackageDir] = await Promise.all([
        downloadPackage(packageName, oldVersion),
        downloadPackage(packageName, newVersion),
      ]);

      VERBOSE && console.error(chalk.blue('Analyzing type definitions...'));
      const [oldEntryPoints, newEntryPoints] = await Promise.all([
        findTypeDefinitions(oldPackageDir),
        findTypeDefinitions(newPackageDir),
      ]);

      if (oldEntryPoints.length === 0) {
        throw new Error(`No TypeScript definitions found for ${packageName}@${oldVersion}`);
      }

      if (newEntryPoints.length === 0) {
        throw new Error(`No TypeScript definitions found for ${packageName}@${newVersion}`);
      }

      console.error(chalk.blue('Extracting public APIs...'));
      const oldAPI = extractPublicAPI(oldEntryPoints);
      const newAPI = extractPublicAPI(newEntryPoints);

      console.error(chalk.blue('Comparing APIs...'));
      const changes = compareAPIs(oldAPI, newAPI);

      outputChanges(packageName, oldVersion, newVersion, changes);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  } finally {
    // Cleanup
    if (oldPackageDir || newPackageDir) {
      await cleanup([oldPackageDir, newPackageDir].filter(Boolean));
    }
  }
}

// Execute main function
main().catch((error) => {
  console.error(chalk.red('Error in API diff script:'), error);
  process.exit(1);
});
