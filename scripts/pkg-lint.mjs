import 'zx/globals';
import { $, fs } from 'zx';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';

const SEVERITIES = ['conventional', 'info', 'warning', 'error'];
const SEVERITY_ICONS = {
  conventional: chalk.green('✓'),
  info: chalk.blue('ℹ'),
  warning: chalk.yellow('⚠'),
  error: chalk.red('✗'),
};
const HIDE_SEVERITIES = ['conventional'];

const packages = await $`pnpm -r ls --depth=-1 --json`.json();

const repoRoot = await $`git rev-parse --show-toplevel`.text().then((text) => text.trim());

for (const { name, path: pkgPath } of packages) {
  let diagnostics = [];

  const addDiagnostic = (severity, name, message) => {
    if (!SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }
    diagnostics.push({ severity, name, message });
  };

  // Read package.json.
  const pkgJsonPath = join(pkgPath, 'package.json');
  const pkgJson = await fs.readJson(pkgJsonPath);

  // Read moon.yml (optional).
  const moonYmlPath = join(pkgPath, 'moon.yml');
  let moonYml = null;
  if (existsSync(moonYmlPath)) {
    const moonYmlContent = await fs.readFile(moonYmlPath, 'utf-8');
    moonYml = YAML.parse(moonYmlContent);
  }

  // Package has browser field - warning.
  if ('browser' in pkgJson) {
    addDiagnostic('warning', 'browser-field', 'package.json has deprecated "browser" field');
  } else {
    addDiagnostic('conventional', 'browser-field', 'no deprecated "browser" field');
  }

  // Package has types field - warning.
  if ('types' in pkgJson) {
    addDiagnostic('warning', 'types-field', 'package.json has root "types" field (use exports instead)');
  } else {
    addDiagnostic('conventional', 'types-field', 'no root "types" field');
  }

  // Package has typesVersions field - warning.
  if ('typesVersions' in pkgJson) {
    addDiagnostic('warning', 'typesVersions-field', 'package.json has "typesVersions" field (use exports instead)');
  } else {
    addDiagnostic('conventional', 'typesVersions-field', 'no "typesVersions" field');
  }

  // Package has main field - warning.
  if ('main' in pkgJson) {
    addDiagnostic('warning', 'main-field', 'package.json has root "main" field (use exports instead)');
  } else {
    addDiagnostic('conventional', 'main-field', 'no root "main" field');
  }

  // Package has module field - warning.
  if ('module' in pkgJson) {
    addDiagnostic('warning', 'module-field', 'package.json has "module" field (use exports instead)');
  } else {
    addDiagnostic('conventional', 'module-field', 'no "module" field');
  }

  // Package has sideEffects - info.
  if ('sideEffects' in pkgJson && pkgJson.sideEffects !== false) {
    addDiagnostic(
      'info',
      'sideEffects-field',
      `package.json has "sideEffects": ${JSON.stringify(pkgJson.sideEffects)}`,
    );
  }

  // Package is not type: module - warning.
  if (pkgJson.type !== 'module') {
    addDiagnostic('warning', 'type-module', `package.json is not "type": "module" (got: ${pkgJson.type ?? 'undefined'})`);
  } else {
    addDiagnostic('conventional', 'type-module', 'package.json is "type": "module"');
  }

  // Package has imports field - info.
  if ('imports' in pkgJson) {
    const importCount = Object.keys(pkgJson.imports).length;
    addDiagnostic('info', 'imports-field', `package.json has "imports" field with ${importCount} entries`);
  }

  // Package has peerDependencies - info.
  if ('peerDependencies' in pkgJson) {
    const peerCount = Object.keys(pkgJson.peerDependencies).length;
    addDiagnostic('info', 'peer-deps', `package.json has ${peerCount} peerDependencies`);
  }

  // Check for missing files field (only for published packages).
  if (!pkgJson.private && !('files' in pkgJson)) {
    addDiagnostic('warning', 'files-field', 'published package has no "files" field');
  }

  // Check for missing license field (only for published packages).
  if (!pkgJson.private && !('license' in pkgJson)) {
    addDiagnostic('warning', 'license-field', 'published package has no "license" field');
  }

  // Empty dependencies object - info.
  if (pkgJson.dependencies && Object.keys(pkgJson.dependencies).length === 0) {
    addDiagnostic('info', 'empty-deps', 'package.json has empty "dependencies" object');
  }

  // Empty devDependencies object - info.
  if (pkgJson.devDependencies && Object.keys(pkgJson.devDependencies).length === 0) {
    addDiagnostic('info', 'empty-dev-deps', 'package.json has empty "devDependencies" object');
  }

  // Check for duplicate dependencies (in both deps and devDeps).
  if (pkgJson.dependencies && pkgJson.devDependencies) {
    const deps = Object.keys(pkgJson.dependencies);
    const devDeps = Object.keys(pkgJson.devDependencies);
    const duplicates = deps.filter((d) => devDeps.includes(d));
    for (const dup of duplicates) {
      addDiagnostic('warning', 'duplicate-dep', `"${dup}" is in both dependencies and devDependencies`);
    }
  }

  // Check for peerDependencies not in devDependencies.
  if (pkgJson.peerDependencies && pkgJson.devDependencies) {
    const peerDeps = Object.keys(pkgJson.peerDependencies);
    const devDeps = Object.keys(pkgJson.devDependencies);
    const missingInDev = peerDeps.filter((p) => !devDeps.includes(p));
    for (const missing of missingInDev) {
      addDiagnostic('info', 'peer-not-in-dev', `peerDependency "${missing}" is not in devDependencies`);
    }
  }

  // Check for non-workspace dependencies using catalog.
  if (pkgJson.dependencies) {
    for (const [dep, version] of Object.entries(pkgJson.dependencies)) {
      if (!version.startsWith('workspace:') && !version.startsWith('catalog:')) {
        addDiagnostic('warning', 'non-catalog-dep', `dependency "${dep}" uses version "${version}" instead of catalog:`);
      }
    }
  }

  // Check exports.
  const exports = pkgJson.exports ?? {};
  for (const [exportPath, exportValue] of Object.entries(exports)) {
    if (typeof exportValue !== 'object' || exportValue === null) {
      continue;
    }

    const conditions = Object.keys(exportValue);
    const allowedConditions = ['source', 'types', 'default'];
    const unexpectedConditions = conditions.filter((c) => !allowedConditions.includes(c));

    // Exports/imports with conditions other than source/types/default - info.
    if (unexpectedConditions.length > 0) {
      addDiagnostic(
        'info',
        'export-conditions',
        `export "${exportPath}" has non-standard conditions: ${unexpectedConditions.join(', ')}`,
      );
    }

    // Types is not the first export - warning.
    if (conditions.includes('types') && conditions[0] !== 'source' && conditions[0] !== 'types') {
      addDiagnostic('warning', 'types-order', `export "${exportPath}": "types" should be first or after "source"`);
    }

    // No source export - warning.
    if (!conditions.includes('source')) {
      addDiagnostic('warning', 'no-source-export', `export "${exportPath}" has no "source" condition`);
    } else {
      // Source export points to a non-existent file - error.
      const sourcePath = join(pkgPath, exportValue.source);
      if (!existsSync(sourcePath)) {
        addDiagnostic(
          'error',
          'source-missing',
          `export "${exportPath}": source file does not exist: ${exportValue.source}`,
        );
      } else {
        addDiagnostic('conventional', 'source-exists', `export "${exportPath}": source file exists`);
      }
    }

    // No default export condition - warning (unless has browser/node).
    const hasRuntimeCondition = conditions.some((c) => ['default', 'browser', 'node', 'import', 'require'].includes(c));
    if (!hasRuntimeCondition) {
      addDiagnostic('warning', 'no-runtime-export', `export "${exportPath}" has no runtime condition (default/browser/node)`);
    }

    // Check if types file exists.
    if (conditions.includes('types') && typeof exportValue.types === 'string') {
      const typesPath = join(pkgPath, exportValue.types);
      if (!existsSync(typesPath)) {
        addDiagnostic('info', 'types-missing', `export "${exportPath}": types file does not exist yet: ${exportValue.types}`);
      }
    }
  }

  // Check moon.yml compile task.
  if (moonYml?.tasks?.compile) {
    const compileArgs = moonYml.tasks.compile.args ?? [];

    // Check platform.
    const platformArg = compileArgs.find((arg) => arg.startsWith('--platform='));
    if (platformArg && platformArg !== '--platform=neutral') {
      addDiagnostic(
        'warning',
        'compile-platform',
        `moon.yml compile task specifies non-neutral platform: ${platformArg}`,
      );
    } else if (platformArg === '--platform=neutral') {
      addDiagnostic('conventional', 'compile-platform', 'compile task uses neutral platform');
    }

    // Check module format.
    const formatArg = compileArgs.find((arg) => arg.startsWith('--format='));
    if (formatArg && formatArg !== '--format=esm') {
      addDiagnostic('warning', 'compile-format', `moon.yml compile task specifies non-esm format: ${formatArg}`);
    }

    // Check entry points (warn if not index.ts).
    const entryPoints = compileArgs.filter((arg) => arg.startsWith('--entryPoint='));
    const mainEntryPoint = entryPoints.find((arg) => arg === '--entryPoint=src/index.ts');
    if (entryPoints.length > 0 && !mainEntryPoint) {
      addDiagnostic('warning', 'compile-entrypoint', 'moon.yml compile task does not include src/index.ts entry point');
    } else if (mainEntryPoint) {
      addDiagnostic('conventional', 'compile-entrypoint', 'compile task includes src/index.ts entry point');
    }

    // Check output path.
    const outDirArg = compileArgs.find((arg) => arg.startsWith('--outDir='));
    if (outDirArg && outDirArg !== '--outDir=dist/lib') {
      addDiagnostic('warning', 'compile-outdir', `moon.yml compile task specifies non-standard output: ${outDirArg}`);
    }

    // Check for --injectGlobals.
    if (compileArgs.includes('--injectGlobals')) {
      addDiagnostic('warning', 'inject-globals', 'moon.yml compile task uses --injectGlobals');
    } else {
      addDiagnostic('conventional', 'inject-globals', 'compile task does not use --injectGlobals');
    }

    // Check for --importGlobals.
    if (compileArgs.includes('--importGlobals')) {
      addDiagnostic('warning', 'import-globals', 'moon.yml compile task uses --importGlobals');
    } else {
      addDiagnostic('conventional', 'import-globals', 'compile task does not use --importGlobals');
    }

    // Check for jobs other than compile, build - info.
    const taskNames = Object.keys(moonYml.tasks ?? {});
    const standardTasks = ['compile', 'build', 'test', 'lint', 'bundle', 'prebuild', 'serve'];
    const nonStandardTasks = taskNames.filter((t) => !standardTasks.includes(t));
    if (nonStandardTasks.length > 0) {
      addDiagnostic('info', 'extra-tasks', `moon.yml has additional tasks: ${nonStandardTasks.join(', ')}`);
    }
  }

  // Check if moon.yml exists for non-private packages.
  if (!pkgJson.private && !moonYml) {
    addDiagnostic('info', 'no-moon-yml', 'published package has no moon.yml');
  }

  // Check moon.yml type field.
  if (moonYml && moonYml.type !== 'library' && moonYml.type !== 'application') {
    addDiagnostic('info', 'moon-type', `moon.yml has type: ${moonYml.type ?? 'undefined'}`);
  }

  // Check moon.yml tags.
  if (moonYml?.tags) {
    if (!moonYml.tags.includes('ts-build') && moonYml.tasks?.compile) {
      addDiagnostic('warning', 'moon-tags', 'moon.yml has compile task but missing "ts-build" tag');
    }
    if (!moonYml.tags.includes('ts-test') && moonYml.tasks?.test) {
      addDiagnostic('warning', 'moon-tags', 'moon.yml has test task but missing "ts-test" tag');
    }
    if (!pkgJson.private && !moonYml.tags.includes('pack')) {
      addDiagnostic('warning', 'moon-tags', 'published package missing "pack" tag in moon.yml');
    }
  }

  // Check tsconfig.json.
  const tsconfigPath = join(pkgPath, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    try {
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf-8');
      // Remove comments for JSON parsing (simple approach).
      const tsconfigClean = tsconfigContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const tsconfig = JSON.parse(tsconfigClean);

      // Check for composite mode.
      if (tsconfig.compilerOptions?.composite === true) {
        addDiagnostic('info', 'tsconfig-composite', 'tsconfig.json uses composite mode');
      }

      // Check for incremental mode.
      if (tsconfig.compilerOptions?.incremental === true) {
        addDiagnostic('info', 'tsconfig-incremental', 'tsconfig.json uses incremental mode');
      }
    } catch {
      addDiagnostic('info', 'tsconfig-parse-error', 'could not parse tsconfig.json');
    }
  }

  // Sort diagnostics by severity (error > warning > info > conventional), then by name.
  const severityOrder = { error: 0, warning: 1, info: 2, conventional: 3 };
  diagnostics.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return a.name.localeCompare(b.name);
  });

  diagnostics = diagnostics.filter((d) => !HIDE_SEVERITIES.includes(d.severity));

  // Print diagnostics.
  if (diagnostics.length > 0) {
    console.log(chalk.bold.underline(name), chalk.gray(relative(repoRoot, join(pkgPath, 'package.json'))));
    for (const { severity, name: diagName, message } of diagnostics) {
      const icon = SEVERITY_ICONS[severity];
      console.log(`  ${icon} ${chalk.bold(diagName)} ${message}`);
    }
    console.log();
  }
}
