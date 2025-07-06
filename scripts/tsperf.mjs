#!/usr/bin/env node

import { chalk } from 'zx';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Project } from 'ts-morph';
import { dirname, resolve, relative } from 'path';
import { existsSync } from 'fs';
import * as inspector from 'node:inspector/promises';
import fs from 'node:fs/promises';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <file> [options]')
  .command('$0 <file>', 'Get TypeScript completions at position 0 for the specified file', (yargs) => {
    yargs.positional('file', {
      describe: 'Path to the TypeScript file',
      type: 'string',
      demandOption: true,
    });
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Show verbose output including project loading details',
    default: false,
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    description: 'Limit the number of completions to display',
    default: 50,
  })
  .option('auto-imports', {
    alias: 'a',
    type: 'boolean',
    description: 'Include auto-import suggestions in completions',
    default: false,
  })
  .option('position', {
    alias: 'p',
    type: 'number',
    description: 'Character position in file to get completions at (default: 0)',
    default: 0,
  })
  .option('diagnostics', {
    alias: 'd',
    type: 'boolean',
    description: 'Show detailed diagnostics about the TypeScript project state',
    default: false,
  })
  .option('summary', {
    alias: 's',
    type: 'boolean',
    description: 'Show only a summary of completion statistics',
    default: false,
  })
  .option('profile', {
    type: 'boolean',
    description: 'Enable CPU profiling and save to profile.cpuprofile',
    default: false,
  })
  .help()
  .alias('help', 'h').argv;

/**
 * Find the closest tsconfig.json file by walking up the directory tree
 * @param {string} filePath - Path to start searching from
 * @returns {string|null} - Path to tsconfig.json or null if not found
 */
function findTsConfig(filePath) {
  let currentDir = dirname(resolve(filePath));

  while (currentDir !== dirname(currentDir)) {
    const tsconfigPath = resolve(currentDir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Profiling utilities using Node.js Inspector API
 */
const session = new inspector.Session();

async function enableProfiling() {
  try {
    await session.connect();
    await session.post('Profiler.enable');
  } catch (error) {
    console.error('Error enabling profiling:', error);
  }
}

async function startCpuProfiling() {
  try {
    await enableProfiling();
    await session.post('Profiler.start');
  } catch (error) {
    console.error('Error starting CPU profiling:', error);
  }
}

async function stopCpuProfiling() {
  try {
    const { profile } = await session.post('Profiler.stop');
    await fs.writeFile('./profile.cpuprofile', JSON.stringify(profile));
    console.log(chalk.green('CPU profile saved to profile.cpuprofile'));
  } catch (error) {
    console.error('Error stopping CPU profiling:', error);
  } finally {
    await session.disconnect();
  }
}

// Signal handlers for external profiling control
process.on('SIGUSR1', startCpuProfiling);
process.on('SIGUSR2', stopCpuProfiling);

/**
 * Get completions at the specified position for the specified file
 * @param {string} filePath - Path to the TypeScript file
 * @param {boolean} verbose - Whether to show verbose output
 * @param {number} limit - Maximum number of completions to show
 * @param {boolean} includeAutoImports - Whether to include auto-import suggestions
 * @param {number} position - Character position in file to get completions at
 * @param {boolean} showDiagnostics - Whether to show detailed diagnostics
 * @param {boolean} showSummary - Whether to show only summary statistics
 * @param {boolean} enableProfiling - Whether to enable CPU profiling
 */
async function getCompletions(
  filePath,
  verbose,
  limit,
  includeAutoImports,
  position,
  showDiagnostics,
  showSummary,
  enableProfiling,
) {
  const resolvedFilePath = resolve(filePath);

  if (!existsSync(resolvedFilePath)) {
    console.error(chalk.red(`Error: File does not exist: ${filePath}`));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.blue(`Looking for TypeScript configuration for: ${resolvedFilePath}`));
  }

  // Find the tsconfig.json file
  const tsconfigPath = findTsConfig(resolvedFilePath);

  if (!tsconfigPath) {
    console.error(chalk.red(`Error: No tsconfig.json found for file: ${filePath}`));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.green(`Found tsconfig.json: ${tsconfigPath}`));
    console.log(chalk.blue('Initializing TypeScript project...'));
  }

  // Initialize the TypeScript project
  const project = new Project({
    tsConfigFilePath: tsconfigPath,
    skipAddingFilesFromTsConfig: false,
    skipFileDependencyResolution: false,
    skipLoadingLibFiles: false,
    useInMemoryFileSystem: false,
  });

  if (verbose || showDiagnostics) {
    const sourceFiles = project.getSourceFiles();
    console.log(chalk.green(`Project loaded with ${sourceFiles.length} source files`));

    // Force program creation and analysis
    const program = project.getProgram();
    const compilerOptions = program.compilerObject.getCompilerOptions();
    console.log(chalk.blue(`Module resolution: ${compilerOptions.moduleResolution}`));
    console.log(chalk.blue(`Base URL: ${compilerOptions.baseUrl || 'none'}`));

    if (showDiagnostics) {
      console.log(chalk.bold.cyan('\n=== Project Diagnostics ==='));
      console.log(chalk.gray(`Root dir: ${compilerOptions.rootDir || 'none'}`));
      console.log(chalk.gray(`Out dir: ${compilerOptions.outDir || 'none'}`));
      console.log(chalk.gray(`Paths mapping: ${compilerOptions.paths ? 'configured' : 'none'}`));

      const nodeModulesFiles = sourceFiles.filter((sf) => sf.getFilePath().includes('node_modules'));
      const projectFiles = sourceFiles.filter(
        (sf) => !sf.getFilePath().includes('node_modules') && !sf.isDeclarationFile(),
      );
      const declarationFiles = sourceFiles.filter(
        (sf) => sf.isDeclarationFile() && !sf.getFilePath().includes('node_modules'),
      );

      console.log(chalk.gray(`Project source files: ${projectFiles.length}`));
      console.log(chalk.gray(`Declaration files: ${declarationFiles.length}`));
      console.log(chalk.gray(`Node modules files: ${nodeModulesFiles.length}`));

      if (projectFiles.length > 0 && verbose) {
        console.log(
          chalk.gray(
            `Project files (first 5): ${projectFiles
              .slice(0, 5)
              .map((sf) => relative(process.cwd(), sf.getFilePath()))
              .join(', ')}`,
          ),
        );
      }
    }

    if (includeAutoImports) {
      console.log(chalk.blue('Triggering symbol analysis for auto-imports...'));

      // Force the language service to analyze the project for auto-imports
      const languageService = project.getLanguageService();
      const tsLanguageService = languageService.compilerObject;

      // Get the program to ensure it's fully constructed
      const lsProgram = tsLanguageService.getProgram();
      if (lsProgram) {
        const typeChecker = lsProgram.getTypeChecker();
        // This forces the type checker to analyze symbols
        const globalSymbol = typeChecker.getSymbolAtLocation(lsProgram.getSourceFiles()[0]);
        console.log(chalk.green('Symbol analysis completed'));

        if (showDiagnostics) {
          // Try to get some diagnostics about available symbols
          const sourceFile = lsProgram.getSourceFile(resolvedFilePath);
          if (sourceFile) {
            const sourceSymbol = typeChecker.getSymbolAtLocation(sourceFile);
            if (sourceSymbol) {
              const exports = typeChecker.getExportsOfModule(sourceSymbol);
              console.log(chalk.gray(`Exports from target file: ${exports ? exports.length : 0}`));
            }
          }
        }
      }
    }
  }

  // Get the source file
  const sourceFile = project.getSourceFile(resolvedFilePath);

  if (!sourceFile) {
    console.error(chalk.red(`Error: File not found in TypeScript project: ${filePath}`));
    console.error(chalk.yellow('Make sure the file is included by the tsconfig.json configuration'));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.blue(`Getting completions at position ${position}...`));
  }

  // Get language service and completions at position 0
  const languageService = project.getLanguageService();
  const tsLanguageService = languageService.compilerObject;

  // Start profiling if enabled
  if (enableProfiling) {
    if (verbose) {
      console.log(chalk.yellow('Starting CPU profiling...'));
    }
    await startCpuProfiling();
  }

  try {
    // Configure completion options for auto-imports
    const completionOptions = {
      includeCompletionsForModuleExports: includeAutoImports,
      includeCompletionsWithInsertText: true,
      includeAutomaticOptionalChainCompletions: true,
      includeCompletionsForImportStatements: includeAutoImports,
      allowIncompleteCompletions: true,
      includePackageJsonAutoImports: includeAutoImports ? 'auto' : 'off',
      includeSymbol: true,
      includeInlayFunctionLikeReturnTypeHints: true,
      includeInlayParameterNameHints: true,
      includeInlayParameterNameHintsWhenArgumentMatchesName: true,
      includeInlayFunctionParameterTypeHints: true,
      includeInlayFunctionReturnTypeHints: true,
      includeInlayEnumMemberValueHints: true,
      includeInlayVariableTypeHints: true,
      includeInlayPropertyDeclarationTypeHints: true,
    };

    if (verbose && includeAutoImports) {
      console.log(chalk.blue('Including auto-import suggestions...'));

      // List some available modules for auto-import
      try {
        const program = tsLanguageService.getProgram();
        if (program) {
          const sourceFiles = program.getSourceFiles();
          const moduleFiles = sourceFiles
            .filter(
              (sf) =>
                !sf.isDeclarationFile &&
                sf.fileName.includes('node_modules') === false &&
                sf.fileName !== resolvedFilePath,
            )
            .slice(0, 5);

          if (moduleFiles.length > 0) {
            console.log(
              chalk.gray(
                `Available project modules for import: ${moduleFiles.map((sf) => relative(process.cwd(), sf.fileName)).join(', ')}`,
              ),
            );
          }
        }
      } catch (e) {
        // Ignore errors in module listing
      }
    }

    const completions = tsLanguageService.getCompletionsAtPosition(resolvedFilePath, position, completionOptions);

    if (!completions || !completions.entries || completions.entries.length === 0) {
      console.log(chalk.yellow(`No completions found at position ${position}`));
      return;
    }

    // Calculate statistics for summary mode
    const totalCompletions = completions.entries.length;
    const autoImportEntries = completions.entries.filter((c) => c.hasAction || c.source);
    const autoImportCount = autoImportEntries.length;

    // Count unique source files for auto-imports
    const uniqueSources = new Set();
    autoImportEntries.forEach((entry) => {
      if (entry.source) {
        uniqueSources.add(entry.source);
      }
    });
    const uniqueSourceCount = uniqueSources.size;

    // Group completions by kind for statistics
    const kindStats = {};
    completions.entries.forEach((completion) => {
      kindStats[completion.kind] = (kindStats[completion.kind] || 0) + 1;
    });

    // Show summary if requested
    if (showSummary) {
      console.log(chalk.bold.green(`\n📊 Completion Summary`));
      console.log(chalk.gray(`File: ${relative(process.cwd(), resolvedFilePath)}`));
      console.log(chalk.gray(`Position: ${position}`));
      console.log();

      console.log(chalk.bold.cyan(`📋 Total Completions: ${chalk.white(totalCompletions)}`));

      if (includeAutoImports) {
        console.log(chalk.bold.yellow(`📥 Auto-import Suggestions: ${chalk.white(autoImportCount)}`));
        console.log(chalk.bold.blue(`📁 Unique Import Sources: ${chalk.white(uniqueSourceCount)}`));

        if (uniqueSourceCount > 0 && verbose) {
          const sourceList = Array.from(uniqueSources).slice(0, 5);
          console.log(
            chalk.gray(
              `   Sources: ${sourceList.join(', ')}${uniqueSourceCount > 5 ? ` (+${uniqueSourceCount - 5} more)` : ''}`,
            ),
          );
        }
      }

      console.log();
      console.log(chalk.bold.magenta(`🏷️  Completion Types:`));
      Object.entries(kindStats)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .forEach(([kind, count]) => {
          const percentage = ((count / totalCompletions) * 100).toFixed(1);
          console.log(
            `   ${chalk.cyan(kind.padEnd(12))} ${chalk.white(count.toString().padStart(4))} ${chalk.gray(`(${percentage}%)`)}`,
          );
        });

      if (includeAutoImports && autoImportCount > 0) {
        console.log();
        console.log(chalk.bold.green(`✨ Auto-import Summary:`));
        console.log(
          `   ${chalk.gray('Percentage of total:')} ${chalk.white(((autoImportCount / totalCompletions) * 100).toFixed(1))}%`,
        );

        if (autoImportCount > 0) {
          const autoImportByKind = {};
          autoImportEntries.forEach((entry) => {
            autoImportByKind[entry.kind] = (autoImportByKind[entry.kind] || 0) + 1;
          });

          console.log(`   ${chalk.gray('Top auto-import types:')}`);
          Object.entries(autoImportByKind)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([kind, count]) => {
              console.log(`     ${chalk.cyan(kind)} ${chalk.white(count)}`);
            });
        }
      }

      return; // Exit early in summary mode
    }

    // Display detailed results (non-summary mode)
    console.log(chalk.bold.green(`\nFound ${totalCompletions} completions at position ${position}:`));
    console.log(chalk.gray(`File: ${relative(process.cwd(), resolvedFilePath)}`));
    console.log(chalk.gray(`TSConfig: ${relative(process.cwd(), tsconfigPath)}`));
    console.log();

    // Sort completions by kind and name for better readability
    const sortedCompletions = completions.entries.slice(0, limit).sort((a, b) => {
      // Sort by kind first, then by name
      const kindOrder = a.kind.localeCompare(b.kind);
      return kindOrder !== 0 ? kindOrder : a.name.localeCompare(b.name);
    });

    // Group completions by kind for better display
    const groupedCompletions = {};
    sortedCompletions.forEach((completion) => {
      if (!groupedCompletions[completion.kind]) {
        groupedCompletions[completion.kind] = [];
      }
      groupedCompletions[completion.kind].push(completion);
    });

    // Display grouped completions
    Object.entries(groupedCompletions).forEach(([kind, items]) => {
      console.log(chalk.bold.cyan(`${kind} (${items.length}):`));
      items.forEach((completion) => {
        let displayName = completion.name;
        let suffixInfo = [];

        // Add auto-import information if available
        if (completion.source) {
          suffixInfo.push(chalk.gray(`from ${completion.source}`));
        }

        // Add hasAction indicator for auto-imports
        if (completion.hasAction) {
          suffixInfo.push(chalk.yellow('📥 auto-import'));
        }

        // Add insert text info if different from name
        if (completion.insertText && completion.insertText !== completion.name) {
          suffixInfo.push(chalk.cyan(`→ ${completion.insertText}`));
        }

        // Add kind-specific formatting
        switch (completion.kind) {
          case 'function':
          case 'method':
            displayName = chalk.yellow(displayName) + chalk.gray('()');
            break;
          case 'class':
            displayName = chalk.blue(displayName);
            break;
          case 'interface':
            displayName = chalk.magenta(displayName);
            break;
          case 'variable':
          case 'property':
            displayName = chalk.green(displayName);
            break;
          case 'keyword':
            displayName = chalk.red(displayName);
            break;
          default:
            displayName = chalk.white(displayName);
        }

        // Combine display name with suffix info
        const fullDisplay =
          suffixInfo.length > 0
            ? `${displayName} ${chalk.gray('(')}${suffixInfo.join(', ')}${chalk.gray(')')}`
            : displayName;

        console.log(`  ${fullDisplay}`);
      });
      console.log();
    });

    if (completions.entries.length > limit) {
      console.log(
        chalk.yellow(`... and ${completions.entries.length - limit} more completions (use --limit to show more)`),
      );
    }

    // Show auto-import details if enabled
    if (includeAutoImports) {
      if (autoImportCount > 0) {
        console.log(chalk.bold.green(`\nAuto-import suggestions found: ${autoImportCount} entries`));

        if (verbose) {
          console.log(chalk.bold.yellow(`\nAuto-import details (showing first 10):`));

          // Use auto-import entries from the sorted/limited completions for details
          const limitedAutoImportEntries = sortedCompletions.filter((c) => c.hasAction || c.source);

          for (const entry of limitedAutoImportEntries.slice(0, 10)) {
            console.log(chalk.cyan(`  ${entry.name}:`));
            if (entry.source) {
              console.log(chalk.gray(`    Source: ${entry.source}`));
            }
            if (entry.hasAction) {
              console.log(chalk.gray(`    Has auto-import action: ${entry.hasAction}`));
            }
            if (entry.sortText) {
              console.log(chalk.gray(`    Sort priority: ${entry.sortText}`));
            }

            // Try to get detailed information
            try {
              const details = tsLanguageService.getCompletionEntryDetails(
                resolvedFilePath,
                position,
                entry.name,
                {},
                entry.source,
                {},
                entry.data,
              );

              if (details) {
                if (details.displayParts && details.displayParts.length > 0) {
                  const displayText = details.displayParts.map((p) => p.text).join('');
                  console.log(chalk.gray(`    Type: ${displayText}`));
                }
                if (details.codeActions && details.codeActions.length > 0) {
                  const importAction = details.codeActions[0];
                  if (importAction.description) {
                    console.log(chalk.gray(`    Import action: ${importAction.description}`));
                  }
                }
              }
            } catch (err) {
              console.log(chalk.red(`    Error getting details: ${err.message}`));
            }
            console.log();
          }

          if (limitedAutoImportEntries.length > 10) {
            console.log(chalk.yellow(`    ... and ${limitedAutoImportEntries.length - 10} more auto-import entries`));
          }
        }
      } else {
        console.log(chalk.yellow('\nNo auto-import suggestions found'));
        if (verbose) {
          console.log(chalk.gray('This could mean:'));
          console.log(chalk.gray('  - No importable symbols at this position'));
          console.log(chalk.gray('  - Project analysis not complete'));
          console.log(chalk.gray('  - Position not suitable for imports'));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error getting completions:'), error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Stop profiling if enabled
    if (enableProfiling) {
      if (verbose) {
        console.log(chalk.yellow('Stopping CPU profiling...'));
      }
      await stopCpuProfiling();
    }
  }
}

async function main() {
  try {
    const startTime = Date.now();

    await getCompletions(
      argv.file,
      argv.verbose,
      argv.limit,
      argv['auto-imports'],
      argv.position,
      argv.diagnostics,
      argv.summary,
      argv.profile,
    );

    if (argv.verbose) {
      const duration = Date.now() - startTime;
      console.log(chalk.gray(`\nCompleted in ${duration}ms`));
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    if (argv.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
