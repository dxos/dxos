//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import * as vscode from 'vscode';

import { DEFAULT_OPTIONS, type FoldRange, type LineRange, type SymbolNode, selectBodies } from './select.ts';

const SECTION = 'implFold';

/** Language servers (tsserver in particular) answer with nothing until the project has loaded. */
const RETRY_DELAYS_MS = [0, 300, 1000, 2500];

const FOLDING_KINDS: Record<number, FoldRange['kind']> = {
  [vscode.FoldingRangeKind.Comment]: 'comment',
  [vscode.FoldingRangeKind.Imports]: 'imports',
  [vscode.FoldingRangeKind.Region]: 'region',
};

const toSymbolNode = (symbol: vscode.DocumentSymbol): SymbolNode => ({
  name: symbol.name,
  kind: vscode.SymbolKind[symbol.kind],
  range: { start: symbol.range.start.line, end: symbol.range.end.line },
  selectionLine: symbol.selectionRange.start.line,
  children: symbol.children.map(toSymbolNode),
});

const isDocumentSymbol = (symbol: vscode.DocumentSymbol | vscode.SymbolInformation): symbol is vscode.DocumentSymbol =>
  'children' in symbol;

/** Resolves to `undefined` while the language's providers are not ready yet. */
const findBodies = async (document: vscode.TextDocument): Promise<LineRange[] | undefined> => {
  const [symbols, foldingRanges] = await Promise.all([
    vscode.commands.executeCommand<(vscode.DocumentSymbol | vscode.SymbolInformation)[] | undefined>(
      'vscode.executeDocumentSymbolProvider',
      document.uri,
    ),
    vscode.commands.executeCommand<vscode.FoldingRange[] | undefined>(
      'vscode.executeFoldingRangeProvider',
      document.uri,
    ),
  ]);
  if (!symbols || symbols.length === 0) {
    return undefined;
  }

  const config = vscode.workspace.getConfiguration(SECTION, document);
  return selectBodies({
    // Flat `SymbolInformation` carries no hierarchy or name line, so it cannot locate bodies.
    symbols: symbols.filter(isDocumentSymbol).map(toSymbolNode),
    foldingRanges: (foldingRanges ?? []).map((range) => ({
      start: range.start,
      end: range.end,
      kind: range.kind === undefined ? undefined : FOLDING_KINDS[range.kind],
    })),
    lineAt: (line) => document.lineAt(line).text,
    bodyKinds: config.get<string[]>('bodySymbolKinds', [...DEFAULT_OPTIONS.bodyKinds]),
    valueKinds: config.get<string[]>('valueSymbolKinds', [...DEFAULT_OPTIONS.valueKinds]),
    containerPattern: toPattern(config.get<string>('containerSymbolPattern')),
  });
};

/** A malformed user pattern falls back to the default rather than disabling every fold. */
const toPattern = (source: string | undefined): RegExp => {
  if (source === undefined) {
    return DEFAULT_OPTIONS.containerPattern;
  }
  try {
    return new RegExp(source);
  } catch {
    return DEFAULT_OPTIONS.containerPattern;
  }
};

const OXC_LANGUAGES = new Set(['typescript', 'typescriptreact', 'javascript', 'javascriptreact']);

type OxcModule = typeof import('./oxc.ts');

let oxcModule: Promise<OxcModule | undefined> | undefined;

/** The native parser ships for some platforms only; elsewhere the language-server path still works. */
const loadOxc = () => {
  oxcModule ??= import('./oxc.ts').catch((error: unknown) => {
    console.warn('[impl-fold] oxc-parser unavailable, using the language server', error);
    return undefined;
  });
  return oxcModule;
};

/** Parses JS/TS in-process, so a cold editor does not wait for tsserver to load the project. */
const findBodiesInProcess = async (document: vscode.TextDocument): Promise<LineRange[] | undefined> => {
  const config = vscode.workspace.getConfiguration(SECTION, document);
  if (config.get<string>('parser', 'auto') !== 'auto' || !OXC_LANGUAGES.has(document.languageId)) {
    return undefined;
  }
  const oxc = await loadOxc();
  return oxc?.findBodiesOxc(
    document.fileName,
    document.getText(),
    toPattern(config.get<string>('containerSymbolPattern')),
  );
};

const findBodiesWithRetry = async (document: vscode.TextDocument): Promise<LineRange[] | undefined> => {
  const parsed = await findBodiesInProcess(document);
  if (parsed) {
    return parsed;
  }
  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (document.isClosed) {
      return undefined;
    }
    const bodies = await findBodies(document);
    if (bodies) {
      return bodies;
    }
  }
  return undefined;
};

type Action = 'editor.fold' | 'editor.unfold';

/** `editor.fold`/`editor.unfold` act on the active editor only, so the target must still be in front. */
const apply = async (editor: vscode.TextEditor, action: Action, bodies: LineRange[]) => {
  if (bodies.length === 0 || vscode.window.activeTextEditor !== editor) {
    return;
  }
  await vscode.commands.executeCommand(action, { levels: 1, selectionLines: bodies.map((body) => body.start) });
};

const run = async (action: Action) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const bodies = await findBodiesWithRetry(editor.document);
  if (!bodies) {
    void vscode.window.setStatusBarMessage('Impl Fold: no symbols for this file', 3000);
    return;
  }
  await apply(editor, action, bodies);
};

const isAutoEnabled = () => vscode.workspace.getConfiguration(SECTION).get<boolean>('autoCollapse', false);

type CacheEntry = { hash: string; bodies: LineRange[] };

const CACHE_KEY = 'implFold.bodies';
const CACHE_LIMIT = 500;

const hashOf = (document: vscode.TextDocument) => createHash('sha1').update(document.getText()).digest('base64');

/** Opening at a definition (F12, search result) must not hide the code it jumped to. */
const awayFromCursor = (editor: vscode.TextEditor, bodies: LineRange[]) => {
  const cursorLines = editor.selections.map((selection) => selection.active.line);
  return bodies.filter((body) => !cursorLines.some((line) => line > body.start && line <= body.end));
};

export const activate = (context: vscode.ExtensionContext) => {
  // Each document is auto-collapsed once per open, so bodies the user expands stay expanded.
  const collapsed = new Set<string>();

  // VS Code paints a file before its language server answers, so the bodies found last time are applied first to
  // keep the unfolded flash to a frame; the content hash rules out stale lines.
  const cache = new Map<string, CacheEntry>(context.globalState.get<[string, CacheEntry][]>(CACHE_KEY, []));
  const pending = new Map<string, Promise<LineRange[] | undefined>>();

  const remember = (key: string, entry: CacheEntry) => {
    cache.delete(key);
    cache.set(key, entry);
    for (const oldest of cache.keys()) {
      if (cache.size <= CACHE_LIMIT) {
        break;
      }
      cache.delete(oldest);
    }
    void context.globalState.update(CACHE_KEY, [...cache]);
  };

  /** Shares one provider round trip between the open-time prefetch and the editor that shows the document. */
  const compute = (document: vscode.TextDocument) => {
    const key = document.uri.toString();
    const inFlight = pending.get(key);
    if (inFlight) {
      return inFlight;
    }
    const version = document.version;
    const hash = hashOf(document);
    const result = findBodiesWithRetry(document).then((bodies) => {
      pending.delete(key);
      if (bodies && document.version === version) {
        remember(key, { hash, bodies });
      }
      return bodies;
    });
    pending.set(key, result);
    return result;
  };

  const autoCollapse = async (editor: vscode.TextEditor | undefined) => {
    if (!editor || !isAutoEnabled()) {
      return;
    }
    const document = editor.document;
    const key = document.uri.toString();
    if (collapsed.has(key)) {
      return;
    }
    collapsed.add(key);

    const cached = cache.get(key);
    if (cached && cached.hash === hashOf(document)) {
      await apply(editor, 'editor.fold', awayFromCursor(editor, cached.bodies));
      void compute(document);
      return;
    }

    const bodies = await compute(document);
    if (!bodies) {
      collapsed.delete(key);
      return;
    }
    await apply(editor, 'editor.fold', awayFromCursor(editor, bodies));
  };

  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = 'implFold.toggleAutoCollapse';
  const updateStatus = () => {
    const enabled = isAutoEnabled();
    statusItem.text = enabled ? '$(fold) Impl' : '$(unfold) Impl';
    statusItem.tooltip = enabled
      ? 'Implementation bodies auto-collapse on open (click to turn off)'
      : 'Implementation bodies do not auto-collapse (click to turn on)';
    statusItem.show();
  };
  updateStatus();

  context.subscriptions.push(
    statusItem,
    vscode.commands.registerCommand('implFold.collapseAll', () => run('editor.fold')),
    vscode.commands.registerCommand('implFold.expandAll', () => run('editor.unfold')),
    vscode.commands.registerCommand('implFold.toggleAutoCollapse', async () => {
      const enabled = !isAutoEnabled();
      await vscode.workspace
        .getConfiguration(SECTION)
        .update('autoCollapse', enabled, vscode.ConfigurationTarget.Global);
      if (enabled) {
        // Every editor already open counts as unseen, starting with the one in front.
        collapsed.clear();
        await autoCollapse(vscode.window.activeTextEditor);
      }
    }),
    // A document opens before its editor is shown, so the provider round trip starts that much earlier.
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isAutoEnabled() && !collapsed.has(document.uri.toString())) {
        void compute(document);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => autoCollapse(editor)),
    vscode.workspace.onDidCloseTextDocument((document) => collapsed.delete(document.uri.toString())),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${SECTION}.autoCollapse`)) {
        updateStatus();
      }
    }),
  );

  void autoCollapse(vscode.window.activeTextEditor);
};

export const deactivate = () => {};
