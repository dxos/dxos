//
// Copyright 2026 DXOS.org
//

//
// Development preload for `./bin/dx` / `bun run src/bin.ts`.
//
// The CLI's own `.tsx` sources are Solid components that need `@opentui/solid`'s Babel transform.
// Transitively-loaded React `.tsx` files from workspace packages (e.g. `@dxos/react-ui-attention`)
// must not get it: they would be rewritten to import a JSX runtime they don't depend on, and module
// resolution fails. The production build (`moon run cli:bundle`) sidesteps this by marking
// `@dxos/react-ui-*` as external in `scripts/build.ts`.
//
// This preload replaces `@opentui/solid/preload`, which imports Babel at module scope and so cost
// every `dx` start. The transform is loaded with the first CLI `.tsx` file instead, which only the
// TUI commands import.
//

import { type PluginBuilder, plugin } from 'bun';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

// Bun applies plugin onLoad handlers on a first-match-wins basis. The lookahead rejects any path under
// `packages/devtools/cli/src/` (either separator), so this claims every other JSX/TSX file in the
// monorepo and returns it to bun's default loader unmodified.
const NON_CLI_JSX = /^(?!.*[/\\]packages[/\\]devtools[/\\]cli[/\\]src[/\\]).*\.(?:j|t)sx$/;

const CLI_JSX = /[/\\]packages[/\\]devtools[/\\]cli[/\\]src[/\\].*\.(?:j|t)sx$/;

// Under bun, `solid-js` resolves to its server build, which has no reactivity.
const SOLID_SERVER_BUILD = /[/\\]node_modules[/\\]solid-js[/\\](store[/\\])?dist[/\\]server\.js$/;

const LOADER_BY_EXT: Record<string, 'tsx' | 'jsx'> = {
  '.tsx': 'tsx',
  '.jsx': 'jsx',
};

type OnLoad = Parameters<PluginBuilder['onLoad']>[1];

let solidTransform: Promise<OnLoad> | undefined;

/** Captures the `.tsx` handler `@opentui/solid/bun-plugin` registers, importing it (and Babel) on first use. */
const loadSolidTransform = (build: PluginBuilder): Promise<OnLoad> =>
  (solidTransform ??= import('@opentui/solid/bun-plugin').then(({ default: solid }) => {
    let transform: OnLoad | undefined;
    solid.setup({
      ...build,
      onLoad: (constraints, callback) => {
        if (constraints.filter.test('component.tsx')) {
          transform = callback;
        }
        return build;
      },
    });
    if (!transform) {
      throw new Error('@opentui/solid/bun-plugin registered no .tsx handler.');
    }
    return transform;
  }));

plugin({
  name: 'dxos-cli-dev-passthrough',
  setup(build) {
    build.onLoad({ filter: NON_CLI_JSX }, async (args) => {
      const loader = LOADER_BY_EXT[extname(args.path)] ?? 'tsx';
      const contents = await readFile(args.path, 'utf8');
      return { contents, loader };
    });
  },
});

plugin({
  name: 'dxos-cli-dev-solid',
  setup(build) {
    build.onLoad({ filter: SOLID_SERVER_BUILD }, async (args) => {
      const client = args.path.replace(
        /server\.js$/,
        SOLID_SERVER_BUILD.exec(args.path)?.[1] ? 'store.js' : 'solid.js',
      );
      return { contents: await readFile(client, 'utf8'), loader: 'js' };
    });
    build.onLoad({ filter: CLI_JSX }, async (args) => (await loadSolidTransform(build))(args));
  },
});
