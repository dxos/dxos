//
// Copyright 2026 DXOS.org
//

// Entry point for the dx-introspect-mcp CLI. Boots an introspector against the
// monorepo root inferred from cwd (or --root) and exposes it over stdio.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { createIntrospector } from '@dxos/introspect';

import { fileLogger } from './logger';
import { createServer } from './server';

type Args = {
  root: string;
  logPath?: string;
};

const parseArgs = (argv: string[]): Args => {
  let root: string | undefined;
  let logPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root' && i + 1 < argv.length) {
      root = argv[++i];
    } else if (arg === '--log-path' && i + 1 < argv.length) {
      logPath = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  const resolvedRoot = root ? resolveRoot(root) : findMonorepoRoot(process.cwd());
  if (!resolvedRoot) {
    console.error('Could not find monorepo root (looking for pnpm-workspace.yaml). Pass --root explicitly.');
    process.exit(1);
  }
  return { root: resolvedRoot, logPath };
};

const resolveRoot = (root: string): string => (isAbsolute(root) ? root : resolve(process.cwd(), root));

const findMonorepoRoot = (start: string): string | null => {
  let cursor = start;
  while (true) {
    if (existsSync(`${cursor}/pnpm-workspace.yaml`)) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
};

const printUsage = (): void => {
  console.error(
    [
      'Usage: dx-introspect-mcp [options]',
      '',
      'Options:',
      '  --root <path>       Monorepo root (default: discovered from cwd via pnpm-workspace.yaml)',
      '  --log-path <path>   Append-only JSONL log of tool calls (default: stderr-silent)',
      '  -h, --help          Show this help',
    ].join('\n'),
  );
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const args = parseArgs(argv);
  const introspector = createIntrospector({ monorepoRoot: args.root });
  await introspector.ready;

  const server = createServer({
    introspector,
    name: '@dxos/introspect-mcp',
    version: '0.0.1',
    logger: args.logPath ? fileLogger(args.logPath) : undefined,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Stay alive until stdin closes — the SDK handles that signal internally.
};
