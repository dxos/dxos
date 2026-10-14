//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import type { CommitInfo, RepositoryFile, TreeEntry } from '../../services/RepositoryClient.ts';
import { type RepositoryView } from './RepositoryToolbar.tsx';
import { RepositoryViewer } from './RepositoryViewer.tsx';

const hash = (seed: number) => seed.toString(16).padStart(2, '0').repeat(20);

const entry = (path: string, type: TreeEntry['type'] = 'file'): TreeEntry => ({
  name: path.split('/').at(-1) ?? path,
  path,
  type,
  hash: hash(path.length),
  mode: type === 'directory' ? '040000' : '100644',
});

/** Every listing the story can serve, as the service would return them. */
const TREE: Record<string, TreeEntry[]> = {
  '': [entry('src', 'directory'), entry('public', 'directory'), entry('package.json'), entry('README.md')],
  'src': [entry('src/components', 'directory'), entry('src/index.ts'), entry('src/main.tsx')],
  'src/components': [entry('src/components/App.tsx')],
  'public': [entry('public/index.html')],
};

const FILES: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'hello-sandbox', version: '0.1.0', type: 'module' }, null, 2),
  'README.md': '# Hello Sandbox\n\nBuilt in a sandbox and pushed to this repository.\n',
  'src/index.ts': 'export const greet = (name: string) => `Hello, ${name}!`;\n',
  'src/main.tsx':
    "import { createRoot } from 'react-dom/client';\n\nimport { App } from './components/App';\n\ncreateRoot(document.getElementById('root')!).render(<App />);\n",
  'src/components/App.tsx': 'export const App = () => <h1>Hello from a sandbox</h1>;\n',
  'public/index.html': '<!doctype html>\n<html>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n',
};

const COMMITS: CommitInfo[] = ['Add App component', 'Scaffold project', 'Initial commit'].map((message, index) => ({
  hash: hash(index + 1),
  message,
  author: { name: 'DXOS Sandbox', email: 'sandbox@dxos.org', timestamp: new Date(2026, 8, 29 - index).toISOString() },
  committer: {
    name: 'DXOS Sandbox',
    email: 'sandbox@dxos.org',
    timestamp: new Date(2026, 8, 29 - index).toISOString(),
  },
  parents: index < 2 ? [hash(index + 2)] : [],
  tree: hash(index + 10),
}));

const toFile = (path: string): RepositoryFile | undefined => {
  const content = FILES[path];
  return content === undefined
    ? undefined
    : { path, hash: hash(path.length), content, encoding: 'utf-8', size: content.length };
};

const DefaultStory = ({ empty }: { empty?: boolean }) => {
  const [currentRef, setCurrentRef] = useState<string | undefined>(empty ? undefined : 'main');
  const [view, setView] = useState<RepositoryView>('files');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['src']));
  const [selectedPath, setSelectedPath] = useState<string | undefined>('src/index.ts');

  // Listings "load" when their directory is expanded, as they do against the service.
  const directories = new Map(
    Object.entries(TREE).filter(([path]) => path === '' || expanded.has(path)) as [string, TreeEntry[]][],
  );

  const handleExpandedChange = useCallback((path: string, open: boolean) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  return (
    <RepositoryViewer
      branches={
        empty
          ? []
          : [
              { name: 'main', commit: hash(1) },
              { name: 'feature', commit: hash(4) },
            ]
      }
      currentRef={currentRef}
      view={view}
      directories={empty ? new Map() : directories}
      expanded={expanded}
      selectedPath={selectedPath}
      file={selectedPath ? toFile(selectedPath) : undefined}
      commits={COMMITS}
      onRefChange={setCurrentRef}
      onViewChange={setView}
      onRefresh={() => {}}
      onExpandedChange={handleExpandedChange}
      onSelectPath={setSelectedPath}
      onSelectCommit={(commit) => {
        setCurrentRef(commit);
        setView('files');
      }}
    />
  );
};

const meta = {
  title: 'plugins/plugin-sandbox/components/RepositoryViewer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { empty: true },
};
