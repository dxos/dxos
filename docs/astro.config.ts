//
// Copyright 2025 DXOS.org
//

import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { type AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import starlightLinksValidator from 'starlight-links-validator';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import { type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';

import { DEFAULT_PACKAGES, importMapPlugin, pluginConfigPlugin } from '@dxos/app-framework/vite-plugin';
import { LAYER_ORDER, ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ModuleUrlPlugin } from '@dxos/vite-plugin-module-url';

import { generateIslandBase, generateTheme, generateWebflowScoped } from './scripts/gen-theme.mjs';
import { ISLAND_ROOTS, PAGE_LAYERS } from './src/demos/layers.ts';
import { assertContentExists, parsePages, readSpec, sidebarFromSpec } from './src/echo/spec.ts';

generateTheme();
generateIslandBase(ISLAND_ROOTS);
generateWebflowScoped(ISLAND_ROOTS);

const themeLayers = PAGE_LAYERS.filter((name) => (LAYER_ORDER as readonly string[]).includes(name));
if (themeLayers.join() !== LAYER_ORDER.join()) {
  throw new Error(`PAGE_LAYERS no longer contains the theme's LAYER_ORDER: ${LAYER_ORDER.join(', ')}`);
}

const specPages = parsePages(readSpec());
assertContentExists(specPages);

/** Routes of the stub pages `src/pages/docs/[...slug].astro` renders for planned spec pages. */
const plannedRoutes = new Set(specPages.filter((page) => page.status === 'planned').map((page) => page.route));

/** Node builtins the `@dxos/*` sources import, shimmed for the browser only: the server build needs the real ones. */
const browserNodeStd = (): Plugin => ({
  name: 'docs:browser-node-std',
  enforce: 'pre',
  applyToEnvironment: (environment) => environment.name === 'client',
  resolveId(id, importer) {
    const name = /^(?:node:)?(util|path|crypto|stream)$/.exec(id)?.[1];
    return name ? this.resolve(`@dxos/node-std/${name}`, importer, { skipSelf: true }) : undefined;
  },
});

/** Lowers the `using` declarations in `@dxos/*` sources, which Safari cannot parse. */
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'];

/**
 * Safari has no `Symbol.dispose`, and a chunk evaluated before `@dxos/util` polyfills it keys dispose methods under
 * `undefined`, so every chunk starts with this. `globalThis.Symbol` survives chunks that bind `Symbol` (`Schema.Symbol`).
 */
const disposePolyfill = `{
  const S = globalThis.Symbol;
  typeof S.dispose !== 'symbol' && Object.defineProperty(S, 'dispose', { value: S.for('dispose') });
  typeof S.asyncDispose !== 'symbol' && Object.defineProperty(S, 'asyncDispose', { value: S.for('asyncDispose') });
}`;

/** Astro's per-environment `esnext` target overrides `build.target`. */
const browserBuildTarget = (): Plugin => ({
  name: 'docs:browser-build-target',
  configEnvironment: (name) =>
    name === 'client'
      ? {
          build: {
            target: browserTargets,
            rolldownOptions: { output: { intro: `${disposePolyfill}\n${sharedImport}` } },
          },
        }
      : undefined,
});

/** Dedupes `import()` by URL and runs one at a time; see {@link shareDynamicImports}. */
const sharedImport = `globalThis.__dxImport ??= (() => {
  const loads = new Map();
  let last = Promise.resolve();
  return (url) => {
    let load = loads.get(url);
    if (!load) {
      load = last.then(() => import(url));
      last = load.catch(() => {});
      loads.set(url, load);
    }
    return load;
  };
})();`;

type Node = { type: string; start: number; end: number; source?: Node };

/**
 * Safari 26 can settle an `import()` while another still evaluates a chunk they share, leaving `undefined` exports, so
 * every dynamic import goes through {@link sharedImport}.
 */
const shareDynamicImports = (): Plugin => ({
  name: 'docs:share-dynamic-imports',
  applyToEnvironment: (environment) => environment.name === 'client',
  generateBundle: {
    // After Vite's preload helper, which finds each import's CSS by matching `import(`.
    order: 'post',
    handler(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.code.includes('import(')) {
          continue;
        }
        // The minifier renames the helper's parameter, so its own `import()` is found by position.
        const helper = chunk.code.indexOf('__dxImport??=');
        const isHelper = (node: Node) => helper >= 0 && node.start > helper && node.start < helper + 200;
        const imports: Node[] = [];
        const walk = (value: unknown) => {
          if (Array.isArray(value)) {
            value.forEach(walk);
          } else if (value && typeof value === 'object') {
            const node = value as Node;
            if (node.type === 'ImportExpression' && !isHelper(node)) {
              imports.push(node);
            }
            Object.values(node).forEach(walk);
          }
        };
        walk(this.parse(chunk.code));
        let code = chunk.code;
        for (const { start, end, source } of imports.sort((left, right) => right.start - left.start)) {
          const specifier = chunk.code.slice(source!.start, source!.end);
          code = `${code.slice(0, start)}__dxImport(new URL(${specifier}, import.meta.url).href)${code.slice(end)}`;
        }
        chunk.code = code;
      }
    },
  },
});

/** The `import()` in Astro's minified island loader. */
const islandImport = 'return await import(e)}catch';

/** Routes Astro's island loader through {@link sharedImport}, inlined because the loader runs before any chunk. */
const shareIslandImports = (): Plugin => ({
  name: 'docs:share-island-imports',
  transform(code, id) {
    if (!/astro-island\.prebuilt(-dev)?\.js$/.test(id)) {
      return;
    }
    if (!code.includes(islandImport)) {
      throw new Error(`docs:share-island-imports: Astro's island loader no longer has \`${islandImport}\`.`);
    }
    return code.replace(
      islandImport,
      `${sharedImport.replace(/;$/, '')};return await globalThis.__dxImport(new URL(e,document.baseURI).href)}catch`,
    );
  },
});

const rootDir = path.resolve(import.meta.dirname, '..');
const phosphorIconsCore = path.join(rootDir, 'node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, 'packages/ui/brand/assets/icons');
const extendedIcons = path.join(rootDir, 'packages/ui/ui-icons/assets');

// https://astro.build/config
// The PLEX section moved from `/docs/composer/` and then `/docs/app-framework/`; each of its pages keeps both old URLs as redirects.
const PLEX_CONTENT = path.join(import.meta.dirname, 'src/content/docs/docs/plex');
const plexRedirects = Object.fromEntries(
  fs
    .readdirSync(PLEX_CONTENT, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => file.replace(/\.mdx?$/, ''))
    .flatMap((slug) => [
      [`/docs/composer/${slug}`, `/docs/plex/${slug}/`],
      [`/docs/app-framework/${slug}`, `/docs/plex/${slug}/`],
    ]),
);

const redirects: Record<string, string> = {
  '/docs/halo/introduction': '/docs/halo/overview/',
  '/docs/halo/typescript': '/docs/halo/api/identity/',
  // Section roots were `welcome` pages before they were titled Overview.
  '/docs/echo/welcome': '/docs/echo/overview/',
  '/docs/halo/welcome': '/docs/halo/overview/',
  '/docs/app-framework/welcome': '/docs/plex/overview/',
  '/docs/composer/welcome': '/docs/plex/overview/',
  // The llms.txt pages moved from each section's Agents group to its Resources group.
  '/docs/echo/agents/llms-txt': '/docs/echo/resources/llms-txt/',
  '/docs/plex/agents/llms-txt': '/docs/plex/resources/llms-txt/',
  // Why PLEX? took Try Composer's place in Start here.
  '/docs/app-framework/try': '/docs/plex/why-plex/',
  '/docs/composer/try': '/docs/plex/why-plex/',
  '/docs/plex/try': '/docs/plex/why-plex/',
  // Build with a coding agent took Build a plugin with the assistant's place in Start here.
  '/docs/app-framework/build-a-plugin-with-the-assistant': '/docs/plex/build-with-a-coding-agent/',
  '/docs/composer/build-a-plugin-with-the-assistant': '/docs/plex/build-with-a-coding-agent/',
  '/docs/plex/build-a-plugin-with-the-assistant': '/docs/plex/build-with-a-coding-agent/',
  // Build with a coding agent replaced the Open in Claude pages.
  '/docs/app-framework/agents/open-in-claude': '/docs/plex/build-with-a-coding-agent/',
  '/docs/composer/agents/open-in-claude': '/docs/plex/build-with-a-coding-agent/',
  '/docs/echo/agents/open-in-claude': '/docs/echo/build-with-a-coding-agent/',
  '/docs/plex/agents/open-in-claude': '/docs/plex/build-with-a-coding-agent/',
  // Anatomy of a plugin became the Plugins and modules concept page.
  '/docs/app-framework/introduction': '/docs/plex/concepts/plugins/',
  '/docs/composer/introduction': '/docs/plex/concepts/plugins/',
  '/docs/plex/introduction': '/docs/plex/concepts/plugins/',
  // App Graph and Translations are app-level, so they moved to Guides.
  '/docs/plex/concepts/app-graph': '/docs/plex/guides/app-graph/',
  '/docs/plex/guides/translations': '/docs/plex/guides/app-capabilities/',
  // The plugin manifest page is omitted for now.
  '/docs/plex/resources/manifest': '/docs/plex/guides/plugin/',
  // ECHO's namespace pages moved from Guides to API, and Concurrency and conflicts became Changes and branches.
  '/docs/echo/guides/database': '/docs/echo/api/database/',
  '/docs/echo/guides/feed': '/docs/echo/api/feed/',
  '/docs/echo/guides/filter': '/docs/echo/api/filter/',
  '/docs/echo/guides/obj': '/docs/echo/api/obj/',
  '/docs/echo/guides/query': '/docs/echo/api/query/',
  '/docs/echo/guides/ref': '/docs/echo/api/ref/',
  '/docs/echo/guides/relation': '/docs/echo/api/relation/',
  '/docs/echo/guides/type': '/docs/echo/api/type/',
  '/docs/echo/concepts/conflicts': '/docs/echo/concepts/changes/',
  // HALO's namespace pages moved from Guides to API, React moved into Guides, and the learning path became the contact book.
  '/docs/halo/guides/identity': '/docs/halo/api/identity/',
  '/docs/halo/guides/invitation': '/docs/halo/api/invitation/',
  '/docs/halo/guides/space': '/docs/halo/api/space/',
  '/docs/halo/learn/create-identity': '/docs/halo/learn/your-profile/',
  '/docs/halo/learn/your-name': '/docs/halo/learn/your-profile/',
  '/docs/halo/learn/contact-book': '/docs/halo/learn/the-halo-identity/',
  '/docs/halo/learn/invite-member': '/docs/halo/learn/invite-people/',
  '/docs/halo/react': '/docs/halo/guides/react/',
  ...plexRedirects,
};

/**
 * Writes the redirects to `_redirects`, which Cloudflare serves as 301s before any asset, so a reader never sees
 * the "Redirecting from" page Astro emits for a static build. Each source also gets its trailing-slash form.
 */
const cloudflareRedirects = (): AstroIntegration => ({
  name: 'docs:cloudflare-redirects',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const lines = Object.entries(redirects).flatMap(([from, to]) => [`${from} ${to} 301`, `${from}/ ${to} 301`]);
      fs.writeFileSync(new URL('_redirects', dir), `${lines.join('\n')}\n`);
    },
  },
});

/** The page the inspector embed runs on, which loads the reader's plugin from its dev server. */
const INSPECTOR_PAGE = 'embed/inspector/index.html';

/**
 * Gives the inspector page Composer's import map, so a plugin loaded from its dev server imports the page's own copies
 * of the shared packages. The map is built with the client bundle and written into the page once the build is done,
 * since Astro renders pages without Vite's HTML hooks. A dev server has no map, so loading a dev plugin needs a build.
 */
const inspectorImportMap = (): AstroIntegration => {
  let importMap: { imports: Record<string, string> } | undefined;
  // The shared packages the docs depend on; a plugin that imports another one fails to load here. Solid's need its JSX
  // transform, which the docs do not run.
  const packages = DEFAULT_PACKAGES.filter(
    (name) => !name.includes('solid') && fs.existsSync(path.join(import.meta.dirname, 'node_modules', name)),
  );
  const plugins = importMapPlugin({ packages, onImportMap: (map) => (importMap = map) });
  return {
    name: 'docs:inspector-import-map',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        if (command === 'build') {
          updateConfig({
            vite: {
              plugins: plugins.map((plugin) => ({
                ...plugin,
                applyToEnvironment: (environment) => environment.name === 'client',
              })),
            },
          });
        }
      },
      'astro:build:done': ({ dir }) => {
        if (!importMap) {
          throw new Error('The inspector import map was not built.');
        }
        const file = new URL(INSPECTOR_PAGE, dir);
        const page = fs.readFileSync(file, 'utf8');
        const script = `<script type="importmap">${JSON.stringify(importMap)}</script>`;
        fs.writeFileSync(file, page.replace('<head>', `<head>${script}`));
      },
    },
  };
};

export default defineConfig({
  site: 'https://dxos.org',
  redirects,
  // The `/echo` demos are React islands built from the workspace's `@dxos/*` sources and the react-ui theme.
  vite: {
    plugins: [
      // Replaces each plugin's `dx.config.ts` with its manifest, as in the apps.
      pluginConfigPlugin(),
      browserBuildTarget(),
      shareDynamicImports(),
      shareIslandImports(),
      importSource({ include: ['@dxos/**', '#*'] }),
      browserNodeStd(),
      DxosLogPlugin(),
      ModuleUrlPlugin(),
      IconsPlugin({
        symbolPattern: iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] }),
        assetPath: (iconSet, name, variant) => {
          switch (iconSet) {
            case 'dx':
              return `${dxosIcons}/${name}.svg`;
            case 'px':
              return `${extendedIcons}/${name}.svg`;
            default:
              return `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
          }
        },
        spriteFile: 'icons.svg',
        contentPaths: [
          path.join(rootDir, '{packages,tools}/**/dist/**/*.{mjs,html}'),
          path.join(rootDir, '{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
          path.join(import.meta.dirname, 'src/demos/**/*.{ts,tsx}'),
          path.join(import.meta.dirname, 'src/echo/snippets/tile-*.tsx'),
          path.join(import.meta.dirname, 'src/tile-tutorial/**/*.{ts,tsx}'),
        ],
        scanPaths: [path.join(rootDir, 'packages/ui/ui-icons/src/index.ts')],
      }),
      ThemePlugin({ srcCssPath: path.join(import.meta.dirname, 'src/styles/demo-theme.css') }),
      wasm(),
    ],
    resolve: {
      // `starlight-sidebar-topics`, the only importer of `astro:i18n`, would otherwise pull in Astro's page manifest.
      // That makes every page a dependency of the Starlight routes in Astro's build graph, and Astro then adds the
      // styles of any page's island, such as the `/echo` demos', to every docs page. The plugin only calls
      // `getRelativeLocaleUrl` for a site with locales, and this one has none.
      alias: [{ find: /^astro:i18n$/, replacement: path.join(import.meta.dirname, 'src/sidebar-topics-i18n.ts') }],
    },
    optimizeDeps: {
      exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
    },
    // Workers the demos start load wasm with top-level await, which only an ES module worker supports.
    worker: {
      format: 'es',
      rolldownOptions: { output: { intro: disposePolyfill } },
      plugins: () => [importSource({ include: ['@dxos/**', '#*'] }), browserNodeStd(), DxosLogPlugin(), wasm()],
    },
  },
  integrations: [
    cloudflareRedirects(),
    inspectorImportMap(),
    react({
      include: [
        '**/src/plex-tutorial/**',
        '**/src/demos/**',
        '**/src/halo-tutorial/**/*.{ts,tsx}',
        '**/src/plex/**',
        '**/src/echo-tutorial/**',
      ],
    }),
    starlight({
      title: 'DXOS Documentation',
      lastUpdated: true,
      favicon: '/favicon.ico',
      // `viewport-fit=cover` extends the page under Safari's status bar so the header's safe-area padding fills it.
      head: [
        {
          tag: 'meta',
          attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        },
      ],
      customCss: ['./src/styles/tokens.generated.css', './src/styles/fonts.css', './src/styles/theme.css'],
      components: {
        Footer: './src/components/Footer.astro',
        Head: './src/components/Head.astro',
        Header: './src/components/Header.astro',
        // Welcome pages put the title in a hero; see `WelcomeHero.astro`.
        // The sidebar folds into a menu below 72rem; see `PageFrame.astro`.
        PageFrame: './src/components/PageFrame.astro',
        PageTitle: './src/components/PageTitle.astro',
        // Drops the topic list; the header switches topics. See `topic-nav/TopicNav.astro`.
        Sidebar: './src/components/Sidebar.astro',
        // TODO(wittjosiah): Uncomment to link logo to home page.
        // SiteTitle: './src/components/CustomSiteTitle.astro',
      },
      logo: {
        light: './node_modules/@dxos/brand/assets/logotypes/dxos-horizontal-block.svg',
        dark: './node_modules/@dxos/brand/assets/logotypes/dxos-horizontal-white.svg',
        alt: 'DXOS Logotype',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dxos/dxos' },
        { icon: 'discord', label: 'Discord', href: 'https://dxos.org/discord' },
        { icon: 'blueSky', label: 'Bluesky', href: 'https://bsky.app/profile/dxos.org' },
        { icon: 'x.com', label: 'X', href: 'https://x.com/dxos_org' },
      ],
      // TODO(wittjosiah): Nested docs subdir is needed because link validation doesn't work with generateId config.
      // Each topic has its own sidebar; Starlight's own `sidebar` option must stay unset.
      plugins: [
        starlightSidebarTopics(
          [
            {
              id: 'echo',
              label: 'ECHO',
              link: '/docs/echo/overview/',
              icon: 'seti:db',
              items: sidebarFromSpec(specPages, 'ECHO'),
            },
            {
              id: 'halo',
              label: 'HALO',
              link: '/docs/halo/overview/',
              icon: 'seti:lock',
              items: sidebarFromSpec(specPages, 'HALO'),
            },
            {
              id: 'mesh',
              label: 'MESH',
              link: '/docs/mesh/overview/',
              items: sidebarFromSpec(specPages, 'MESH'),
            },
            {
              id: 'edge',
              label: 'EDGE',
              link: '/docs/edge/overview/',
              items: sidebarFromSpec(specPages, 'EDGE'),
            },
            {
              id: 'sage',
              label: 'SAGE',
              link: '/docs/sage/overview/',
              items: sidebarFromSpec(specPages, 'SAGE'),
            },
            {
              id: 'plex',
              label: 'PLEX',
              link: '/docs/plex/overview/',
              items: sidebarFromSpec(specPages, 'PLEX'),
            },
            {
              id: 'tile',
              label: 'TILE',
              link: '/docs/tile/overview/',
              items: sidebarFromSpec(specPages, 'TILE'),
            },
          ],
          // Pages missing from a section's sidebar, such as the old plugin tutorial, still belong to it.
          {
            topics: {
              echo: ['/docs/echo/**'],
              edge: ['/docs/edge/**'],
              halo: ['/docs/halo/**'],
              mesh: ['/docs/mesh/**'],
              plex: ['/docs/plex/**'],
              sage: ['/docs/sage/**'],
              tile: ['/docs/tile/**'],
            },
          },
        ),
        // The validator cannot resolve custom pages under `src/pages` (`/blog`, the product pages, `/privacy`, `/terms`,
        // planned stubs), so it sees neither links to them nor the headings that same-page links in blog posts target.
        starlightLinksValidator({
          exclude: ({ file, link }) =>
            file.includes('/src/content/blog/') ||
            ['/typedoc/', '/blog/'].some((prefix) => link.startsWith(prefix)) ||
            ['/composer', '/echo', '/plugins', '/privacy', '/terms'].includes(link.split(/[?#]/)[0]) ||
            plannedRoutes.has(link.split(/[?#]/)[0].replace(/\/?$/, '/')),
        }),
      ],
    }),
  ],
});
