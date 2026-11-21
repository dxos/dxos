//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import * as AsyncResult from 'effect/reactivity/AsyncResult';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { I18nProvider } from 'react-aria-components';

import * as AtomEx from '@dxos/effect/AtomEx';
import {
  Tree,
  type TreeItemDataProps,
  type TreeModel,
  type TreeNode,
  type TreeRootHandle,
  type TreeSelectEvent,
} from '@dxos/react-ui-list';
import { SearchList } from '@dxos/react-ui-search';
import { translations as searchTranslations } from '@dxos/react-ui-search/translations';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Card from '@dxos/react-ui/Card';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Theme from '@dxos/react-ui/Theme';
import { translations } from '@dxos/react-ui/translations';

import * as Protocol from '../../workspace/Protocol.ts';
import { api } from '../client.ts';
import { FOLDER_TYPES, ICONS as VSCODE_ICONS } from './vscode-icons.generated.ts';

/**
 * The tree tab: the repository's file tree down to each package, then each package's entrypoints and
 * their exports (`workspace/Tree.ts`); beside it, a stack of cards, one per item clicked, each
 * showing that item's code. Cmd+P finds a symbol or package by name, reveals it in the tree and adds
 * its card.
 *
 * Children load lazily but one level ahead: a visible branch's row reads its children to know its
 * count, which fetches them, so opening any visible branch finds its children already there.
 */

const TREE_ID = 'code-index-tree';

const ICONS: Record<string, string> = {
  repo: 'ph--git-branch--regular',
  dir: 'ph--folder--regular',
  package: 'ph--package--regular',
  entry: 'ph--sign-in--regular',
  namespace: 'ph--brackets-curly--regular',
  function: 'ph--function--regular',
  class: 'ph--cube--regular',
  interface: 'ph--shapes--regular',
  type: 'ph--shapes--regular',
  enum: 'ph--list-numbers--regular',
  variable: 'ph--hash--regular',
};

const iconOf = (node: Protocol.TreeNode): string =>
  ICONS[node.kind === 'symbol' ? (node.detail ?? '') : node.kind] ?? 'ph--dot--regular';

/** Nodes the tree opens on first sight: everything down to, but not into, a package. */
const openByDefault = (node: Protocol.TreeNode | undefined): boolean => node?.kind === 'repo' || node?.kind === 'dir';

/** How long the loader collects ids before it sends them as one request. */
const BATCH_WINDOW_MS = 16;

/**
 * Batches every id asked for within `BATCH_WINDOW_MS` into a single `TreeChildren` call. A visible
 * level of the tree asks for all its branches at once, so this is one round trip per level, not per row.
 */
const createLoader = (onNodes: (nodes: readonly Protocol.TreeNode[]) => void) => {
  const cache = new Map<string, Promise<readonly Protocol.TreeNode[]>>();
  let pending = new Map<string, (result: Promise<readonly Protocol.TreeNode[]>) => void>();

  const flush = () => {
    const batch = pending;
    pending = new Map();
    const response = api.treeChildren([...batch.keys()]).then((results) => {
      onNodes(results.flatMap((result) => result.children));
      return new Map(results.map((result) => [result.id, result.children]));
    });
    for (const [id, settle] of batch) {
      settle(response.then((byId) => byId.get(id) ?? []));
    }
  };

  return (id: string): Promise<readonly Protocol.TreeNode[]> => {
    const cached = cache.get(id);
    if (cached) {
      return cached;
    }
    const result = new Promise<readonly Protocol.TreeNode[]>((resolve, reject) => {
      if (pending.size === 0) {
        // A window, not a microtask: each atom starts its fetch on its own scheduler tick, so a level of the tree
        // arrives spread over several ticks and a microtask would send nearly every id in its own request.
        setTimeout(flush, BATCH_WINDOW_MS);
      }
      pending.set(id, (settled) => settled.then(resolve, reject));
    });
    // A failed level is retried on the next read rather than cached as empty.
    result.catch(() => cache.delete(id));
    cache.set(id, result);
    return result;
  };
};

const pathKey = (path: readonly string[]) => JSON.stringify(path);

type ExplorerModel = TreeModel<Protocol.TreeNode> & {
  readonly currentAtom: Atom.Writable<string | undefined>;
  readonly openAtom: (path: readonly string[]) => Atom.Writable<boolean>;
  /** Resolves once every id's children are loaded, so a reveal finds each ancestor's row. */
  readonly ensureLoaded: (registry: AtomRegistry.AtomRegistry, ids: readonly string[]) => Promise<void>;
};

const createModel = (): ExplorerModel => {
  const nodes = new Map<string, Protocol.TreeNode>();
  const load = createLoader((loaded) => {
    for (const node of loaded) {
      nodes.set(node.id, node);
    }
  });

  // Kept alive so a branch scrolled away and back does not refetch and flash empty.
  const children = Atom.family((id: string) => Atom.make(Effect.promise(() => load(id))).pipe(Atom.keepAlive));

  const childIds = Atom.family((id: string) =>
    Atom.make((get) => AsyncResult.getOrElse(get(children(id)), () => []).map((node) => node.id)),
  );

  const item = Atom.family((id: string) => Atom.make(() => nodes.get(id)));

  // Paths are keyed by their JSON so the same node under two parents keeps its own state.
  const open = Atom.family((key: string) => {
    const path: string[] = JSON.parse(key);
    return Atom.make(openByDefault(nodes.get(path.at(-1) ?? ''))).pipe(Atom.keepAlive);
  });

  const currentAtom = Atom.make<string | undefined>(undefined).pipe(Atom.keepAlive);
  const current = Atom.family((key: string) => Atom.make((get) => get(currentAtom) === key));

  const itemProps = Atom.family((key: string) =>
    Atom.make((get): TreeItemDataProps => {
      const path: string[] = JSON.parse(key);
      const id = path.at(-1) ?? '';
      const node = nodes.get(id);
      return {
        id,
        label: node?.label ?? id,
        icon: node ? iconOf(node) : undefined,
        // Reading the children of every visible branch is what fetches one level ahead of what is open.
        parentOf: node?.branch ? get(childIds(id)) : undefined,
        testId: `tree-${node?.kind ?? 'node'}`,
      };
    }),
  );

  const ensureLoaded = (registry: AtomRegistry.AtomRegistry, ids: readonly string[]) =>
    Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve) => {
            const atom = children(id);
            if (!AsyncResult.isInitial(registry.get(atom))) {
              resolve();
              return;
            }
            const unsubscribe = registry.subscribe(atom, (result) => {
              if (!AsyncResult.isInitial(result)) {
                unsubscribe();
                resolve();
              }
            });
          }),
      ),
    ).then(() => undefined);

  return {
    item,
    childIds: (parentId?: string) => childIds(parentId ?? Protocol.TREE_ROOT),
    itemOpen: (path: string[]) => open(pathKey(path)),
    itemCurrent: (path: string[]) => current(pathKey(path)),
    itemProps: (path: string[]) => itemProps(pathKey(path)),
    openAtom: (path) => open(pathKey(path)),
    currentAtom,
    ensureLoaded,
  };
};

/** Codicons are one colour; VS Code tints each declaration kind, light theme first, then dark. */
const SYMBOL_GLYPHS: Record<string, { readonly icon: string; readonly className?: string }> = {
  function: { icon: 'symbol-method', className: 'text-[#652d90] dark:text-[#b180d7]' },
  class: { icon: 'symbol-class', className: 'text-[#d67e00] dark:text-[#ee9d28]' },
  enum: { icon: 'symbol-enum', className: 'text-[#d67e00] dark:text-[#ee9d28]' },
  interface: { icon: 'symbol-interface', className: 'text-[#007acc] dark:text-[#75beff]' },
  variable: { icon: 'symbol-variable', className: 'text-[#007acc] dark:text-[#75beff]' },
  type: { icon: 'symbol-structure' },
  namespace: { icon: 'symbol-namespace' },
};

/** The VS Code glyph for a row: vscode-icons for the file tree, codicons for declarations. */
const glyphOf = (node: Protocol.TreeNode, open: boolean): { readonly icon: string; readonly className?: string } => {
  const opened = open ? '-opened' : '';
  switch (node.kind) {
    case 'repo':
      return { icon: `default-root-folder${opened}` };
    case 'dir': {
      const type = FOLDER_TYPES[node.label];
      return { icon: type ? `folder-type-${type}${opened}` : `default-folder${opened}` };
    }
    case 'package':
      return { icon: 'file-type-npm' };
    case 'entry':
      return { icon: node.detail?.endsWith('.json') ? 'file-type-json' : 'file-type-typescript-official' };
    case 'namespace':
      return SYMBOL_GLYPHS.namespace;
    default:
      return SYMBOL_GLYPHS[node.detail ?? ''] ?? { icon: 'symbol-misc' };
  }
};

/** An icon from the generated subset, inlined so it keeps its own colours (vscode-icons) or takes the row's tint. */
const VsIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const glyph = VSCODE_ICONS[icon];
  return glyph ? (
    <svg
      viewBox={`0 0 ${glyph.width} ${glyph.height}`}
      className={`size-4 ${className ?? ''}`}
      fill='currentColor'
      aria-hidden
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  ) : null;
};

/** A row's trailing column: what the node is, muted beside its name. */
const renderRow = (node: TreeNode<Protocol.TreeNode>) => (
  <Tree.Item node={node}>
    <Tree.ItemIndicator />
    <Tree.ItemIcon>{node.item && <VsIcon {...glyphOf(node.item, node.open)} />}</Tree.ItemIcon>
    <Tree.ItemText />
    {/* A fallback module's detail is its path, which is already its label. */}
    <span className='text-fg-muted truncate pe-2 text-xs'>
      {node.item?.detail !== node.item?.label ? node.item?.detail : undefined}
    </span>
  </Tree.Item>
);

const languageOf = (path: string | undefined): string => {
  const extension = path?.match(/\.([^./]+)$/)?.[1];
  return extension === 'ts' || extension === 'tsx' || extension === 'mts' ? 'typescript' : (extension ?? 'text');
};

/** One card in the stack: the item's code, fetched when the card is added. */
const SourceCard = ({ node, onClose }: { node: Protocol.TreeNode; onClose: () => void }) => {
  const [source, setSource] = useState<Protocol.TreeSource | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    api.treeSource(node.id).then(
      (result) => live && setSource(result ?? null),
      () => live && setSource(null),
    );
    return () => {
      live = false;
    };
  }, [node.id]);

  return (
    <Card.Root data-testid='tree-card'>
      <Card.Header>
        <Card.Title>{source?.title ?? node.label}</Card.Title>
        <Card.Action system='close' onClick={onClose} data-testid='tree-card-close' />
      </Card.Header>
      <Card.Body>
        {source === undefined ? (
          <Card.Text variant='muted'>Loading…</Card.Text>
        ) : source === null ? (
          <Card.Text variant='muted'>No source for this item.</Card.Text>
        ) : (
          <>
            <Card.Text variant='muted'>
              {source.subtitle} · {source.path}:{source.line}
              {source.truncated ? ' · truncated' : ''}
            </Card.Text>
            <SyntaxHighlighter
              language={languageOf(source.path)}
              showLineNumbers
              startingLineNumber={source.line}
              scroll='horizontal'
            >
              {source.code}
            </SyntaxHighlighter>
          </>
        )}
      </Card.Body>
    </Card.Root>
  );
};

/** Cmd+P: names matched on the server as the query changes, best first. */
const GoToDialog = ({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (hit: Protocol.TreeHit) => void;
}) => {
  const [hits, setHits] = useState<readonly Protocol.TreeHit[]>([]);
  const latest = useRef('');

  const handleSearch = useCallback((query: string) => {
    latest.current = query;
    api.treeSearch(query).then(
      // A slow answer to an older query must not replace a newer one.
      (results) => latest.current === query && setHits(results),
      () => latest.current === query && setHits([]),
    );
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      <Dialog.Content placement='start' data-testid='goto-dialog'>
        <Dialog.Body>
          <SearchList.Root onSearch={handleSearch} debounceMs={80} resetSelectionOnChange>
            <SearchList.Input
              placeholder='Go to symbol or package…'
              data-testid='goto-input'
              {...{ [Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
            />
            <SearchList.Viewport classNames='max-h-[24rem]'>
              {hits.length === 0 && <SearchList.Empty />}
              {hits.map((hit) => (
                <SearchList.Item
                  key={hit.node.id}
                  value={hit.node.id}
                  label={hit.node.label}
                  icon={iconOf(hit.node)}
                  suffix={hit.description}
                  onSelect={() => onPick(hit)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};

type ExplorerProps = {
  /** Asks the shell to show the tree tab; Cmd+P works from any tab and lands here. */
  onActivate: () => void;
};

const Explorer = ({ onActivate }: ExplorerProps) => {
  const registry = useContext(RegistryContext);
  const model = useMemo(() => createModel(), []);
  const treeRef = useRef<TreeRootHandle>(null);
  const [searching, setSearching] = useState(false);
  // Newest first; an item already in the stack moves back to the top.
  const [stack, setStack] = useState<readonly Protocol.TreeNode[]>([]);
  const push = useCallback(
    (node: Protocol.TreeNode) => setStack((current) => [node, ...current.filter((entry) => entry.id !== node.id)]),
    [],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        onActivate();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onActivate]);

  const handleOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => registry.set(model.openAtom(path), open),
    [model, registry],
  );

  const handleSelect = useCallback(
    ({ item, path }: TreeSelectEvent<Protocol.TreeNode>) => {
      registry.set(model.currentAtom, pathKey(path));
      push(item);
    },
    [model, registry, push],
  );

  const handlePick = useCallback(
    (hit: Protocol.TreeHit) => {
      setSearching(false);
      push(hit.node);
      const path = [TREE_ID, ...hit.path];
      // Each ancestor's children must be loaded first, or the reveal finds no row and gives up.
      void model.ensureLoaded(registry, [Protocol.TREE_ROOT, ...hit.path.slice(0, -1)]).then(() => {
        registry.set(model.currentAtom, pathKey(path));
        treeRef.current?.reveal(path);
      });
    },
    [model, registry, push],
  );

  // A directory or repository has no code of its own, so activating one opens it instead of adding a card.
  const canSelect = useCallback(
    ({ item }: { item: Protocol.TreeNode }) => item.kind !== 'dir' && item.kind !== 'repo',
    [],
  );

  return (
    <div className='flex dx-grow'>
      <div className='border-separator flex min-w-0 flex-1 flex-col border-r' data-testid='tree-panel'>
        <Tree.Root
          ref={treeRef}
          model={model}
          rootId={Protocol.TREE_ROOT}
          id={TREE_ID}
          virtual='fixed'
          indentGuides
          canSelect={canSelect}
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
        >
          <Tree.Label srOnly>Repository</Tree.Label>
          <Tree.Content>{renderRow}</Tree.Content>
          <Tree.Empty icon='ph--tree-structure--regular' />
        </Tree.Root>
      </div>
      <ScrollArea.Root classNames='min-w-0 flex-1' orientation='vertical'>
        <ScrollArea.Viewport>
          <div className='flex flex-col gap-2 p-2' data-testid='tree-stack'>
            {stack.length === 0 ? (
              <p className='text-fg-muted p-2 text-sm'>
                Click an item in the tree, or press ⌘P, to show its code here.
              </p>
            ) : (
              stack.map((node) => (
                <SourceCard
                  key={node.id}
                  node={node}
                  onClose={() => setStack((current) => current.filter((entry) => entry.id !== node.id))}
                />
              ))
            )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <GoToDialog open={searching} onOpenChange={setSearching} onPick={handlePick} />
    </div>
  );
};

export type ExplorerIslandProps = ExplorerProps;

/** The island's root; its registry is its own, so the tree's atoms live as long as the island. */
export const ExplorerIsland = (props: ExplorerIslandProps) => {
  const themeMode = useDocumentThemeMode();
  const registry = useMemo(() => AtomEx.makeRegistry(), []);
  return (
    <I18nProvider locale='en-US'>
      <Theme.Provider
        tx={Theme.defaultTx}
        themeMode={themeMode}
        resourceExtensions={[...translations, ...searchTranslations]}
      >
        <RegistryContext.Provider value={registry}>
          <Explorer {...props} />
        </RegistryContext.Provider>
      </Theme.Provider>
    </I18nProvider>
  );
};

const subscribeToDocumentClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const useDocumentThemeMode = () =>
  useSyncExternalStore(subscribeToDocumentClass, () =>
    document.documentElement.classList.contains('dark') ? ('dark' as const) : ('light' as const),
  );
