//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { projectSource } from './snippets.ts';
import { parsePages, readSpec } from './spec.ts';

/**
 * The pkg.pr.new build every `@dxos/*` dependency of the project pins. It must be a commit whose packages run outside
 * the monorepo, which main has had since #14487. The install commands in Installation and the React guide name it too.
 */
export const DXOS_COMMIT = '20a14b9';

const DXOS_PACKAGES = [
  'async',
  'client',
  'config',
  'echo',
  'echo-react',
  'graph',
  'keys',
  'node-std',
  'protocols',
  'react-client',
  'react-ui',
  'react-ui-form',
  'react-ui-graph',
  'react-ui-list',
  'react-ui-table',
  'ui-theme',
  'vite-plugin-icons',
];

/** A step of a learning-path page, and where it falls in the path. */
type Step = { name: string; order: number };

/** The step of a learning-path page that writes a region, by `module#region`. */
const readSteps = (project: Project): Map<string, Step> => {
  const steps = new Map<string, Step>();
  const learnDir = join(process.cwd(), project.learnDir);
  // The path runs in the order the spec lists its pages.
  const routes = parsePages(readSpec()).map((page) => page.route);
  const snippet = new RegExp(`<Snippet file="${project.snippetDir}/([\\w/]+)" region="([\\w-]+)"`);
  for (const file of readdirSync(learnDir).filter((file) => file.endsWith('.mdx'))) {
    const source = readFileSync(join(learnDir, file), 'utf8');
    const page = source.match(/^title: (.+)$/m)?.[1] ?? file;
    const position = routes.findIndex((route) => route.endsWith(`/${file.replace(/\.mdx$/, '')}/`));
    let step: Step | undefined;
    for (const line of source.split('\n')) {
      const heading = line.match(/^(\d+)\. \*\*(.+?)\.?\*\*/);
      if (heading) {
        step = { name: `${page}, step ${heading[1]}: ${heading[2]}`, order: position * 100 + Number(heading[1]) };
      }
      const match = line.match(snippet);
      if (match && step) {
        steps.set(`${match[1]}#${match[2]}`, step);
      }
    }
  }
  return steps;
};

const REGION = /^([ \t]*)\/\/ #region ([\w-]+)\n([\s\S]*?)^\1\/\/ #endregion\n/gm;

/** A declaration at the start of a line: its export, and the name or destructuring pattern it binds. */
const DECLARATION =
  /^(export )?(?:(?:const|let) (\[[^\]]*\]|\{[^}]*\}|[\w$]+)|(?:async )?function\*? ([\w$]+)|class ([\w$]+))/;

/**
 * `source` with each region a learning-path page quotes replaced by a stand-in for every name it declares, naming
 * the step that writes it and the file; a region that declares nothing becomes a call that throws where it ran. Regions
 * no step quotes keep their code, and the regions inside them are replaced. The module's imports stay, so the reader's
 * code needs none.
 */
const toStarter = (module: string, file: string, source: string, steps: Map<string, Step>): string => {
  // A module's own imports keep their depth; `todo.ts` sits at the project's root.
  const todoPath = `${'../'.repeat(module.split('/').length - 1) || './'}todo.ts`;
  let replaced = false;
  const replace = (code: string): string =>
    code.replace(REGION, (region, indent: string, name: string, body: string) => {
      const step = steps.get(`${module}#${name}`);
      if (!step) {
        return `${indent}// #region ${name}\n${replace(body)}${indent}// #endregion\n`;
      }
      replaced = true;
      const args = `${JSON.stringify(step.name)}, ${JSON.stringify(file)}, ${step.order}`;
      const names = body
        .split('\n')
        .filter((line) => line.startsWith(indent) && !/^\s/.test(line.slice(indent.length)))
        .flatMap((line) => {
          const match = line.slice(indent.length).match(DECLARATION);
          return match ? [{ exported: match[1] ?? '', binding: match[2] ?? match[3] ?? match[4] }] : [];
        });
      return names.length === 0
        ? `${indent}todo(${args})();\n`
        : names.map(({ exported, binding }) => `${indent}${exported}const ${binding} = todo(${args});\n`).join('');
    });
  const starter = replace(source);
  if (!replaced) {
    return source;
  }
  // The stand-in's import goes last, so the lines above keep the numbers the pages show; imports are hoisted.
  return `${starter}\nimport { todo } from '${todoPath}';\n`;
};

const ECHO_PACKAGE_JSON = {
  name: 'echo-contacts',
  private: true,
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build' },
  dependencies: {
    '@bufbuild/protobuf': '2.11.0',
    ...Object.fromEntries(
      DXOS_PACKAGES.map((name) => [`@dxos/${name}`, `https://pkg.pr.new/dxos/dxos/@dxos/${name}@${DXOS_COMMIT}`]),
    ),
    '@opentelemetry/resources': '^2.12.1',
    'effect': '4.0.4',
    'react': '~19.3.1',
    'react-dom': '~19.3.1',
  },
  devDependencies: {
    '@phosphor-icons/core': '^2.1.1',
    '@types/react': '^19.2.0',
    '@types/react-dom': '^19.2.0',
    // Types the `subscribe` of the client's observables, such as `client.spaces` and an invitation.
    '@types/zen-observable': '^0.8.3',
    '@vitejs/plugin-react': '^6.1.1',
    'tailwindcss': '^4.3.0',
    'typescript': '^5.9.0',
    'vite': '^8.3.7',
    'vite-plugin-wasm': '^3.6.0',
  },
  // StackBlitz installs dependencies before it runs the start command.
  stackblitz: { startCommand: 'npm run dev' },
};

const ECHO_VITE_CONFIG = `import react from '@vitejs/plugin-react';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';

const phosphor = join(import.meta.dirname, 'node_modules/@phosphor-icons/core/assets');

export default defineConfig({
  build: { target: 'esnext' },
  optimizeDeps: {
    // ECHO loads WebAssembly in the page and in its workers.
    exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
    // CommonJS modules only the database worker imports, so the dependency scan does not find them.
    include: ['chalk', 'lodash.defaultsdeep', '@dxos/node-std > deep-equal'],
  },
  worker: { format: 'es', plugins: () => [wasm()] },
  plugins: [
    // The components' stylesheets read theme tokens that Tailwind emits only when a scanned file names them.
    ThemePlugin({ content: ['node_modules/@dxos/*/src/**/*.css'] }),
    // Builds the sprite the components' icons are drawn from.
    IconsPlugin({
      symbolPattern: iconSymbolPattern({ sets: ['ph'] }),
      assetPath: (_set, name, variant) =>
        join(phosphor, variant, variant === 'regular' ? \`\${name}.svg\` : \`\${name}-\${variant}.svg\`),
      spriteFile: 'icons.svg',
      contentPaths: [join(import.meta.dirname, 'src/**/*.{ts,tsx}')],
      // Pre-bundled dependencies skip the plugin's transform, so their icons are found by scanning up front.
      scanPaths: [join(import.meta.dirname, 'node_modules/@dxos/*/dist/**/*.mjs')],
    }),
    react(),
    wasm(),
  ],
});
`;

const TSCONFIG = {
  compilerOptions: {
    target: 'ESNext',
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    lib: ['ESNext', 'DOM', 'DOM.Iterable'],
  },
  include: ['src'],
};

const indexHtml = (title: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <script>
      document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    </script>
  </head>
  <body style="margin: 0">
    <div id="root" style="height: 100vh"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const MAIN = `/// <reference types="vite/client" />
import React, { Component, type ReactNode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App.tsx';
import { type Todo, onTodo } from './todo.ts';

// Each save may write the step the app stopped at, so the app starts over from it with its client.
import.meta.hot?.on('vite:beforeUpdate', () => location.reload());

/** Names the step to write next, once the app reaches code the learning path has not written yet. */
const Next = () => {
  const [todo, setTodo] = useState<Todo>();
  useEffect(() => onTodo(setTodo), []);
  return todo ? (
    <p style={{ margin: 0, padding: '0.75rem 1rem', background: '#fef3c7', color: '#78350f', font: '14px system-ui' }}>
      <strong>Next:</strong> {todo.step}, in <code>{todo.file}</code>. Save, and the app reloads.
    </p>
  ) : null;
};

/** Shows what failed in place of the app, until the next save reloads it. */
class Failed extends Component<{ children: ReactNode }, { error?: unknown }> {
  override state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    return this.state.error === undefined ? (
      this.props.children
    ) : (
      <pre style={{ margin: 0, padding: '1rem', whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <Next />
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <Failed>
        <App />
      </Failed>
    </div>
  </div>,
);
`;

const HALO_PACKAGES = [
  'client',
  'config',
  'halo',
  'halo-adapter-client',
  'halo-react',
  'keys',
  'node-std',
  'protocols',
];

const HALO_PACKAGE_JSON = {
  name: 'halo-contact-book',
  private: true,
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build' },
  dependencies: {
    '@bufbuild/protobuf': '2.11.0',
    ...Object.fromEntries(
      HALO_PACKAGES.map((name) => [`@dxos/${name}`, `https://pkg.pr.new/dxos/dxos/@dxos/${name}@${DXOS_COMMIT}`]),
    ),
    '@opentelemetry/resources': '^2.12.1',
    'effect': '4.0.4',
    'react': '~19.3.1',
    'react-dom': '~19.3.1',
  },
  devDependencies: {
    '@types/react': '^19.2.0',
    '@types/react-dom': '^19.2.0',
    '@types/zen-observable': '^0.8.3',
    '@vitejs/plugin-react': '^6.1.1',
    'typescript': '^5.9.0',
    'vite': '^8.3.7',
    'vite-plugin-wasm': '^3.6.0',
  },
  stackblitz: { startCommand: 'npm run dev' },
};

const HALO_VITE_CONFIG = `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  build: { target: 'esnext' },
  optimizeDeps: {
    // The client loads WebAssembly in the page and in its workers.
    exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
    // CommonJS modules only the database worker imports, so the dependency scan does not find them.
    include: ['chalk', 'lodash.defaultsdeep', '@dxos/node-std > deep-equal'],
  },
  worker: { format: 'es', plugins: () => [wasm()] },
  plugins: [react(), wasm()],
});
`;

/** A learning path's app, and how it becomes a standalone project. */
type Project = {
  /** The app's modules, relative to the docs package. */
  readonly dir: string;
  /** The learning path's pages, relative to the docs package. */
  readonly learnDir: string;
  /** The app's directory as `<Snippet file>` names it. */
  readonly snippetDir: string;
  /** Docs-only files, left out of the project. */
  readonly skipped: ReadonlySet<string>;
  readonly title: string;
  readonly packageJson: object;
  readonly viteConfig: string;
};

export type TutorialProjectId = 'echo' | 'halo';

const PROJECTS: Record<TutorialProjectId, Project> = {
  echo: {
    dir: 'src/echo-tutorial',
    learnDir: 'src/content/docs/docs/echo/learn',
    snippetDir: 'echo-tutorial',
    // The page that reads the stage from the embed's URL.
    skipped: new Set(['app/ContactsEmbedPage.tsx']),
    title: 'Contacts',
    packageJson: ECHO_PACKAGE_JSON,
    viteConfig: ECHO_VITE_CONFIG,
  },
  halo: {
    dir: 'src/halo-tutorial',
    learnDir: 'src/content/docs/docs/halo/learn',
    snippetDir: 'halo-tutorial',
    // The embed's in-memory devices and their frames.
    skipped: new Set(['runtime.ts', 'app/Embed.tsx', 'app/EmbedPage.tsx']),
    title: 'Contact book',
    packageJson: HALO_PACKAGE_JSON,
    viteConfig: HALO_VITE_CONFIG,
  },
};

export type TutorialProjectKind = 'complete' | 'starter';

/** A learning path's app as a standalone Vite project, by path: finished, or with the path's code taken out. */
export const tutorialProject = (kind: TutorialProjectKind, id: TutorialProjectId = 'echo'): Record<string, string> => {
  const project = PROJECTS[id];
  const steps = readSteps(project);
  const files: Record<string, string> = {
    'index.html': indexHtml(project.title),
    'package.json': `${JSON.stringify(project.packageJson, null, 2)}\n`,
    'src/main.tsx': MAIN,
    'tsconfig.json': `${JSON.stringify(TSCONFIG, null, 2)}\n`,
    'vite.config.ts': project.viteConfig,
  };
  const dir = join(process.cwd(), project.dir);
  for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    if (!/\.(tsx?|css)$/.test(file) || project.skipped.has(file)) {
      continue;
    }
    const source = readFileSync(join(dir, file), 'utf8');
    const module = file.replace(/\.tsx?$/, '');
    files[`src/${file}`] = !/\.tsx?$/.test(file)
      ? source
      : projectSource(kind === 'starter' ? toStarter(module, `src/${file}`, source, steps) : source);
  }
  return files;
};
