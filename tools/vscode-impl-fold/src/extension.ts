//
// Copyright 2026 DXOS.org
//

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
  });
};

const findBodiesWithRetry = async (document: vscode.TextDocument): Promise<LineRange[] | undefined> => {
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

export const activate = (context: vscode.ExtensionContext) => {
  // Each document is auto-collapsed once per open, so bodies the user expands stay expanded.
  const collapsed = new Set<string>();

  const autoCollapse = async (editor: vscode.TextEditor | undefined) => {
    if (!editor || !isAutoEnabled()) {
      return;
    }
    const key = editor.document.uri.toString();
    if (collapsed.has(key)) {
      return;
    }
    collapsed.add(key);
    const bodies = await findBodiesWithRetry(editor.document);
    if (!bodies) {
      collapsed.delete(key);
      return;
    }
    // Opening at a definition (F12, search result) must not hide the code it jumped to.
    const cursorLines = editor.selections.map((selection) => selection.active.line);
    const hidden = bodies.filter((body) => !cursorLines.some((line) => line > body.start && line <= body.end));
    await apply(editor, 'editor.fold', hidden);
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
