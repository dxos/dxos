#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const VERBOSE = false,
  USE_TSGO = process.env.DX_USE_TSC !== '1';

/** Matches TypeScript diagnostic file paths, including `../` segments and multi-part extensions. */
const DIAGNOSTIC_FILE = String.raw`[\w./-]+\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*`;

const ANSI = String.raw`\x1B\[[0-9;]*m`;

const ansiGap = String.raw`(?:${ANSI})*`;

/**
 * Rewrite compiler diagnostic paths from package-relative to repo-relative so moon/IDE output
 * is clickable from the monorepo root. Handles classic `(line,col):`, pretty `:line:col -`,
 * related-location lines, summary footers, and ANSI color codes from pretty mode.
 */
const rewriteDiagnosticPaths = (output: string, cwd: string, gitRoot: string): string => {
  const toRepoPath = (filePath: string): string => relative(gitRoot, resolve(cwd, filePath));

  const classic = new RegExp(String.raw`^(${DIAGNOSTIC_FILE})\((\d+),(\d+)\):`, 'gm');
  const pretty = new RegExp(
    String.raw`^(\s*)${ansiGap}(${DIAGNOSTIC_FILE})${ansiGap}:${ansiGap}(\d+)${ansiGap}:${ansiGap}(\d+)${ansiGap} -`,
    'gm',
  );
  const summary = new RegExp(String.raw`starting at: ${ansiGap}(${DIAGNOSTIC_FILE})${ansiGap}:(\d+)`, 'g');

  return output
    .replace(classic, (_, filePath, line, col) => `${toRepoPath(filePath)}(${line},${col}):`)
    .replace(pretty, (_, indent, filePath, line, col) => `${indent}${toRepoPath(filePath)}:${line}:${col} -`)
    .replace(summary, (_, filePath, line) => `starting at: ${toRepoPath(filePath)}:${line}`);
};

const main = async () => {
  // Find and parse tsconfig.json.
  const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!tsconfigPath) {
    console.error('No tsconfig.json found in the current directory.');
    process.exit(1);
  }

  const configFileContent = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFileContent.error) {
    // TODO(wittjosiah): Pretty-print diagnostic.
    console.error(`Failed to read tsconfig.json: ${configFileContent.error.messageText}`);
    process.exit(1);
  }

  const parsedCommandLine = ts.parseJsonConfigFileContent(configFileContent.config, ts.sys, dirname(tsconfigPath));
  if (parsedCommandLine.errors.length > 0) {
    // TODO(wittjosiah): Pretty-print diagnostic.
    console.error(`Failed to parse tsconfig.json: ${parsedCommandLine.errors.map((d) => d.messageText).join('\n')}`);
    process.exit(1);
  }

  // Resolve outDir from tsconfig.
  const outDir = parsedCommandLine.options.outDir;
  VERBOSE && console.log(`OutDir: ${outDir}`);
  if (!outDir) {
    console.error('No outDir found in tsconfig.json.');
    process.exit(1);
  }
  const outDirPath = resolve(process.cwd(), outDir);

  // List files in outDir.
  let files: string[] = [];
  try {
    files = await readdir(outDirPath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      VERBOSE && console.log('Nothing to clean: outDir does not exist.');
    } else {
      console.error(`Failed to read outDir (${outDirPath}): ${err}`);
      process.exit(1);
    }
  }

  // Remove all files except tsconfig.tsbuildinfo.
  await Promise.all(
    files.map(async (file) => {
      // TODO(dmaretskyi): Keeping this file makes tsc skip emitting any files.
      // if (file === 'tsconfig.tsbuildinfo') {
      //   return;
      // }
      const filePath = join(outDirPath, file);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          await rm(filePath, { recursive: true, force: true });
        } else {
          await rm(filePath, { force: true });
        }
        VERBOSE && console.log(`Removed: ${filePath}`);
      } catch (err) {
        console.error(`Failed to remove ${filePath}: ${err}`);
      }
    }),
  );
  VERBOSE && console.log('Clean complete.');

  // Run the compiler after cleaning.
  const compiler = USE_TSGO ? 'tsgo' : 'tsc';
  VERBOSE && console.log(`Running ${compiler}...`);
  const tsc = spawnSync(compiler, [], { encoding: 'utf-8' });

  const cwd = process.cwd();
  const gitRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
  const gitRoot = gitRootResult.stdout?.trim();
  if (!gitRoot) {
    console.error('Failed to determine git root.');
    process.exit(1);
  }

  if (tsc.stdout) {
    process.stdout.write(rewriteDiagnosticPaths(tsc.stdout, cwd, gitRoot));
  }

  if (tsc.stderr) {
    process.stderr.write(rewriteDiagnosticPaths(tsc.stderr, cwd, gitRoot));
  }

  VERBOSE && console.log(`${compiler} exited with status ${tsc.status}`);
  process.exit(tsc.status ?? 1);
};

main().catch((err) => {
  console.error(`Unexpected error: ${err}`);
  process.exit(1);
});
