//
// Copyright 2026 DXOS.org
//

// Turns a page from `deus build Cli.main -o <site> --browser` into the DEUS playground: the
// toolchain's library sources and a sample program in its file system, and with `--codebase <dir>`
// a snapshot of that codebase, so the page can view, eval and test it with no server.
//
//   node platform/browser/playground.mjs <site> [--codebase <dir>]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [site, flag, codebase] = process.argv.slice(2);
const home = new URL('../..', import.meta.url).pathname;

const walk = (dir, into, prefix) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, into, prefix);
    }
    // Codebase files are ASCII text; latin1 keeps any other byte as one code unit.
    else {
      into[prefix + relative(codebase, path)] = readFileSync(path, 'latin1');
    }
  }
  return into;
};

const files = {
  '/deus/deus/builtins.deus': readFileSync(join(home, 'deus/builtins.deus'), 'utf8'),
  '/deus/deus/prelude.deus': readFileSync(join(home, 'deus/prelude.deus'), 'utf8'),
  '/work/hello.deus': [
    'namespace Hello',
    '',
    '/-- Greets everyone in the list. -/',
    'def greet (names : List Text) : {IO} Unit :=',
    '  List.forEach names (fun name => IO.print ("hello, " ++ name ++ "\\n"))',
    '',
    'def main (u : Unit) : {IO} Unit := greet ["browser", "wasm"]',
    '',
  ].join('\n'),
};
const withCodebase = flag === '--codebase';
if (withCodebase) {
  walk(codebase, files, '/codebase/');
}

writeFileSync(
  join(site, 'deus.json'),
  JSON.stringify({
    cwd: '/work',
    env: { HOME: '/home', DEUS_HOME: '/deus', DEUS_CODEBASE: '/codebase' },
    files,
    hide: ['/deus/', '/codebase/'],
    open: '/work/hello.deus',
    run: withCodebase ? ['ls Json', 'eval List.sum [1, 2, 3]'] : ['init', 'add hello.deus', 'run Hello.main'],
  }),
);
