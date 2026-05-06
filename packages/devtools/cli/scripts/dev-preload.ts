//
// Copyright 2026 DXOS.org
//

//
// Development preload for `./bin/dx` / `bun run src/bin.ts`.
//
// The `@opentui/solid/preload` plugin registers a bun `onLoad` handler with
// filter `/\.(js|ts)x$/` that Babel-transforms every `.jsx`/`.tsx` file it
// sees to call `@opentui/solid`. That is correct for the CLI's own solid UI
// code (chat, components, render), but catastrophic for transitively-loaded
// React `.tsx` files from workspace packages (e.g. `@dxos/react-ui-attention`)
// — those files get rewritten to import a JSX runtime they don't depend on,
// and module resolution fails.
//
// The production build (`moon run cli:compile`) sidesteps this by marking
// `@dxos/react-ui-*` as external in `scripts/build.ts`. We need the same
// scoping in dev mode.
//
// This preload registers a bun plugin whose `onLoad` matches the same
// filter but is narrower in scope. It claims any source file whose path
// is NOT under `packages/devtools/cli/src/` and returns the original
// contents with the default loader. Because bun's `onLoad` is
// first-match, this prevents the solid plugin (registered after this one
// in `bunfig.toml`) from ever seeing those files.
//

import { plugin } from 'bun';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

// Match `.jsx`/`.tsx` files anywhere *except* under
// `packages/devtools/cli/src/**`. Bun applies plugin onLoad handlers on a
// first-match-wins basis, so a narrow filter here lets the solid plugin
// (registered later in bunfig.toml) handle the CLI's own sources while we
// claim every other JSX/TSX file in the monorepo and return it to bun's
// default loader unmodified.
//
// The lookahead rejects any path containing `/packages/devtools/cli/src/`
// (Unix) or `\packages\devtools\cli\src\` (Windows). Everything else that
// ends in `.jsx` or `.tsx` matches.
const NON_CLI_JSX = /^(?!.*[\/\\]packages[\/\\]devtools[\/\\]cli[\/\\]src[\/\\]).*\.(?:j|t)sx$/;

const LOADER_BY_EXT: Record<string, 'tsx' | 'jsx'> = {
  '.tsx': 'tsx',
  '.jsx': 'jsx',
};

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
