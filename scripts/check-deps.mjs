#!/usr/bin/env node

import { $ } from 'zx';
import fs from 'fs/promises';
import path from 'path';
import { globby } from 'globby';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import precinct from 'precinct';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
    default: false,
  })
  .option('fix', {
    type: 'boolean',
    description: 'Automatically remove unused dependencies',
    default: false,
  })
  .help().argv;

// Make zx silent by default
$.verbose = false;

// Global file content cache
const fileContentCache = new Map();

/**
 * Get all workspace packages using pnpm
 */
async function getWorkspacePackages() {
  const { stdout } = await $`pnpm ls -r --json --depth -1`;
  return JSON.parse(stdout);
}

/**
 * Read file contents with caching
 */
async function readFileWithCache(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (fileContentCache.has(resolvedPath)) {
    return fileContentCache.get(resolvedPath);
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    fileContentCache.set(resolvedPath, content);
    return content;
  } catch (error) {
    if (argv.verbose) {
      console.warn(chalk.yellow(`Warning: Could not read ${filePath}: ${error.message}`));
    }
    // Cache failures as null to avoid retrying
    fileContentCache.set(resolvedPath, null);
    return null;
  }
}

/**
 * Read package.json from a given path
 */
async function readPackageJson(pkgPath) {
  const content = await fs.readFile(path.join(pkgPath, 'package.json'), 'utf-8');
  return JSON.parse(content);
}

/**
 * Find all source files in a package
 */
async function findSourceFiles(pkgPath, patterns) {
  return globby(patterns, {
    cwd: pkgPath,
    absolute: true,
  });
}

/**
 * Extract dependencies from a file using precinct
 */
async function extractDependencies(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const deps = precinct(content, {
      type: path.extname(filePath).slice(1),
      es6: {
        mixedImports: true,
      },
      tsx: true,
    });
    return deps
      .filter((dep) => !dep.startsWith('.') && !dep.startsWith('@/'))
      .map((dep) => {
        // For scoped packages (@org/pkg/subpath), keep only @org/pkg
        if (dep.startsWith('@')) {
          const [scope, pkg] = dep.split('/');
          return `${scope}/${pkg}`;
        }
        // For regular packages (pkg/subpath), keep only pkg
        return dep.split('/')[0];
      });
  } catch (error) {
    if (argv.verbose) {
      console.warn(chalk.yellow(`Warning: Could not parse dependencies from ${filePath}: ${error.message}`));
    }
    return [];
  }
}

/**
 * Search for a dependency name in all files within a package
 */
async function searchDependencyInFiles(depName, pkgPath) {
  const files = await globby(['**/*'], {
    gitignore: true,
    ignore: ['**/node_modules/**', '**/package.json', '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock'],
    absolute: true,
    cwd: pkgPath,
  });

  for (const file of files) {
    const content = await readFileWithCache(file);
    if (content && content.includes(depName)) {
      if (argv.verbose) {
        console.log(chalk.gray(`Found ${depName} referenced in ${path.relative(pkgPath, file)}`));
      }
      return true;
    }
  }
  return false;
}

/**
 * Analyze dependencies for a package
 */
async function analyzeDependencies(pkg) {
  const pkgJson = await readPackageJson(pkg.path);
  const dependencies = new Set(Object.keys(pkgJson.dependencies || {}));
  const devDependencies = new Set(Object.keys(pkgJson.devDependencies || {}));

  // Find source and test files
  const sourceFiles = await findSourceFiles(pkg.path, [
    'src/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'index.{js,jsx,ts,tsx}',
  ]);
  const testFiles = await findSourceFiles(pkg.path, [
    'test/**/*.{js,jsx,ts,tsx}',
    'tests/**/*.{js,jsx,ts,tsx}',
    'src/**/*.test.{js,jsx,ts,tsx}',
    'src/**/*.spec.{js,jsx,ts,tsx}',
  ]);

  if (argv.verbose) {
    console.log(chalk.blue(`\nAnalyzing package: ${pkgJson.name}`));
    console.log(chalk.gray(`Source files found: ${sourceFiles.length}`));
    console.log(chalk.gray(`Test files found: ${testFiles.length}`));
  }

  // Extract dependencies from source files
  const usedInSource = new Set();
  for (const file of sourceFiles) {
    const deps = await extractDependencies(file);
    deps.forEach((dep) => usedInSource.add(dep));
  }

  // Extract dependencies from test files
  const usedInTests = new Set();
  for (const file of testFiles) {
    const deps = await extractDependencies(file);
    deps.forEach((dep) => usedInTests.add(dep));
  }

  if (argv.verbose) {
    console.log(chalk.gray('\nDependencies found in source:'));
    console.log([...usedInSource].map((d) => `  ${d}`).join('\n'));
    console.log(chalk.gray('\nDependencies found in tests:'));
    console.log([...usedInTests].map((d) => `  ${d}`).join('\n'));
  }

  // Check for unused dependencies and search for text references
  const unusedDeps = [];
  const potentiallyUsedDeps = [];
  for (const dep of [...dependencies].filter((dep) => !usedInSource.has(dep))) {
    const foundInText = await searchDependencyInFiles(dep, pkg.path);
    if (foundInText) {
      potentiallyUsedDeps.push(dep);
    } else {
      unusedDeps.push(dep);
    }
  }

  const unusedDevDeps = [];
  const potentiallyUsedDevDeps = [];
  for (const dep of [...devDependencies].filter((dep) => !usedInTests.has(dep))) {
    const foundInText = await searchDependencyInFiles(dep, pkg.path);
    if (foundInText) {
      potentiallyUsedDevDeps.push(dep);
    } else {
      unusedDevDeps.push(dep);
    }
  }

  // Check for dependencies that should be dev dependencies
  const shouldBeDevDeps = [...dependencies].filter((dep) => !usedInSource.has(dep) && usedInTests.has(dep));

  // Get root package.json to check for duplicated dev dependencies
  const rootPkgJson = await readPackageJson(process.cwd());
  const rootDevDeps = new Set(Object.keys(rootPkgJson.devDependencies || {}));
  const duplicatedDevDeps = [...devDependencies].filter((dep) => rootDevDeps.has(dep));

  return {
    name: pkgJson.name,
    unusedDeps,
    potentiallyUsedDeps,
    unusedDevDeps,
    potentiallyUsedDevDeps,
    shouldBeDevDeps,
    duplicatedDevDeps,
  };
}

/**
 * Remove dependencies from package.json
 */
async function removeDependencies(pkgPath, depsToRemove, isDev) {
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
  const depType = isDev ? 'devDependencies' : 'dependencies';

  if (!pkgJson[depType]) return;

  for (const dep of depsToRemove) {
    delete pkgJson[depType][dep];
  }

  await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

  if (argv.verbose) {
    console.log(chalk.gray(`Removed ${isDev ? 'dev ' : ''}dependencies from ${pkgJsonPath}:`));
    depsToRemove.forEach((dep) => console.log(chalk.gray(`  ${dep}`)));
  }
}

async function main() {
  try {
    const packages = await getWorkspacePackages();
    const rootPath = process.cwd();
    let hasErrors = false;

    for (const pkg of packages) {
      // Skip the root package
      if (pkg.path === rootPath) {
        if (argv.verbose) {
          console.log(chalk.gray('\nSkipping root package'));
        }
        continue;
      }

      const analysis = await analyzeDependencies(pkg);
      const relativePackageJson = path.relative(process.cwd(), path.join(pkg.path, 'package.json'));

      // Collect all dependencies to remove if --fix is enabled
      const depsToRemove = [];
      const devDepsToRemove = [];

      // Output diagnostics in format: <level-5-chars> <package.json-path> <dep-name> <message>
      for (const dep of analysis.unusedDeps) {
        console.log(chalk.red(`error ${relativePackageJson} ${dep} Dependency is not used in source or found in text`));
        if (argv.fix) depsToRemove.push(dep);
        hasErrors = true;
      }

      for (const dep of analysis.potentiallyUsedDeps) {
        console.log(chalk.yellow(`warn  ${relativePackageJson} ${dep} Dependency not imported but found in text`));
      }

      for (const dep of analysis.unusedDevDeps) {
        console.log(
          chalk.red(`error ${relativePackageJson} ${dep} Dev dependency is not used in tests or found in text`),
        );
        if (argv.fix) devDepsToRemove.push(dep);
        hasErrors = true;
      }

      for (const dep of analysis.potentiallyUsedDevDeps) {
        console.log(chalk.yellow(`warn  ${relativePackageJson} ${dep} Dev dependency not imported but found in text`));
      }

      for (const dep of analysis.shouldBeDevDeps) {
        console.log(chalk.red(`error ${relativePackageJson} ${dep} Dependency should be moved to devDependencies`));
        if (argv.fix) {
          depsToRemove.push(dep);
          devDepsToRemove.push(dep); // Will be added to devDependencies
        }
        hasErrors = true;
      }

      for (const dep of analysis.duplicatedDevDeps) {
        console.log(chalk.red(`error ${relativePackageJson} ${dep} Dev dependency is duplicated in root package.json`));
        if (argv.fix) devDepsToRemove.push(dep);
        hasErrors = true;
      }

      // Apply fixes if --fix is enabled and there are dependencies to remove
      if (argv.fix && (depsToRemove.length > 0 || devDepsToRemove.length > 0)) {
        if (depsToRemove.length > 0) {
          await removeDependencies(pkg.path, depsToRemove, false);
        }
        if (devDepsToRemove.length > 0) {
          await removeDependencies(pkg.path, devDepsToRemove, true);
        }

        // For dependencies that should be moved to devDependencies
        const depsToMove = analysis.shouldBeDevDeps.filter((dep) => depsToRemove.includes(dep));
        if (depsToMove.length > 0) {
          const pkgJsonPath = path.join(pkg.path, 'package.json');
          const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));

          // Add to devDependencies
          pkgJson.devDependencies = pkgJson.devDependencies || {};
          for (const dep of depsToMove) {
            pkgJson.devDependencies[dep] = pkgJson.dependencies[dep];
          }

          await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

          if (argv.verbose) {
            console.log(chalk.gray(`Moved dependencies to devDependencies in ${pkgJsonPath}:`));
            depsToMove.forEach((dep) => console.log(chalk.gray(`  ${dep}`)));
          }
        }
      }
    }

    // Exit with error code if there were errors and --fix was not enabled
    if (hasErrors && !argv.fix) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
}

main();
