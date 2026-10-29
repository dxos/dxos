//
// Copyright 2026 DXOS.org
//

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type Connection,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  type InitializeParams,
  type InitializeResult,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  type Document,
  codeLenses,
  completions,
  definition,
  diagnostics,
  documentLinks,
  documentSymbols,
  hover,
  inlayHints,
  toDocument,
  verdictLines,
} from './features.ts';
import { DiskWorkspace, pathOfUri } from './workspace.ts';

/** Custom request: each reviewed item's line and status, for the VS Code margin colours. */
export const VERDICT_LINES_REQUEST = 'mdl/verdictLines';

/** Notification the server sends when a review changed, so a client re-requests its decorations. */
export const REVIEW_CHANGED_NOTIFICATION = 'mdl/reviewChanged';

/** How long edits settle before diagnostics recompute; the index rebuild reads every spec. */
const DIAGNOSTICS_DELAY = 250;

const rootOf = (params: InitializeParams): string | undefined => {
  const uri = params.workspaceFolders?.[0]?.uri ?? params.rootUri;
  if (uri) {
    return fileURLToPath(uri);
  }
  return params.rootPath ?? undefined;
};

/**
 * Serves `.mdl` language features over a connection: the deus lint and completion, links and definitions for
 * `github:` keys and spec references, hover cards, and the review's verdicts as inlay hints and code lenses.
 */
export const startServer = (connection: Connection): void => {
  const documents = new TextDocuments(TextDocument);
  const workspaces = new Map<string, DiskWorkspace>();
  let roots: string[] = [];
  let watchRegistered = false;

  /** The checkout that holds a document: the innermost workspace folder, else one rooted at the file's directory. */
  const workspaceOf = (uri: string): DiskWorkspace | undefined => {
    if (!uri.startsWith('file:')) {
      return undefined;
    }
    const file = fileURLToPath(uri);
    const root =
      roots.filter((candidate) => file.startsWith(candidate)).sort((left, right) => right.length - left.length)[0] ??
      dirname(file);
    let workspace = workspaces.get(root);
    if (!workspace) {
      workspace = new DiskWorkspace(root);
      workspaces.set(root, workspace);
    }
    return workspace;
  };

  const withDocument = <T>(uri: string, run: (workspace: DiskWorkspace, document: Document) => T): T | undefined => {
    const workspace = workspaceOf(uri);
    const text = documents.get(uri)?.getText();
    const path = workspace && pathOfUri(workspace, uri);
    return workspace && path !== undefined && text !== undefined ? run(workspace, toDocument(path, text)) : undefined;
  };

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const validate = (uri: string) => {
    clearTimeout(timers.get(uri));
    timers.set(
      uri,
      setTimeout(() => {
        timers.delete(uri);
        const found = withDocument(uri, diagnostics);
        if (found) {
          void connection.sendDiagnostics({ uri, diagnostics: found });
        }
      }, DIAGNOSTICS_DELAY),
    );
  };
  const validateAll = () => documents.all().forEach(({ uri }) => validate(uri));

  /** A review or a spec changed: diagnostics, hints and lenses of every open spec may depend on it. */
  const refreshViews = () => {
    validateAll();
    void connection.languages.inlayHint.refresh().catch(() => undefined);
    void connection.sendRequest('workspace/codeLens/refresh').catch(() => undefined);
    void connection.sendNotification(REVIEW_CHANGED_NOTIFICATION);
  };

  connection.onInitialize((params): InitializeResult => {
    roots = (params.workspaceFolders?.map(({ uri }) => fileURLToPath(uri)) ?? [rootOf(params)]).filter(
      (root): root is string => root !== undefined,
    );
    watchRegistered = params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration === true;
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: ['#', ' ', ':'] },
        definitionProvider: true,
        hoverProvider: true,
        documentLinkProvider: { resolveProvider: false },
        documentSymbolProvider: true,
        inlayHintProvider: true,
        codeLensProvider: { resolveProvider: false },
      },
      serverInfo: { name: 'mdl-language-server', version: '0.1.0' },
    };
  });

  connection.onInitialized(() => {
    if (watchRegistered) {
      void connection.client.register(DidChangeWatchedFilesNotification.type, {
        watchers: [{ globPattern: '**/*.mdl' }],
      });
    }
  });

  connection.onDidChangeWatchedFiles(({ changes }) => {
    for (const { uri, type } of changes) {
      const workspace = workspaceOf(uri);
      const path = workspace && pathOfUri(workspace, uri);
      if (!workspace || path === undefined) {
        continue;
      }
      if (type === FileChangeType.Changed) {
        workspace.refresh(path);
      } else {
        workspace.rescan();
      }
    }
    refreshViews();
  });

  documents.onDidOpen(({ document }) => {
    const workspace = workspaceOf(document.uri);
    const path = workspace && pathOfUri(workspace, document.uri);
    if (workspace && path !== undefined) {
      workspace.setOpen(path, document.getText());
    }
  });
  documents.onDidChangeContent(({ document }) => {
    const workspace = workspaceOf(document.uri);
    const path = workspace && pathOfUri(workspace, document.uri);
    if (workspace && path !== undefined) {
      workspace.setOpen(path, document.getText());
    }
    if (path?.endsWith('.review.mdl')) {
      refreshViews();
    } else {
      validate(document.uri);
    }
  });
  documents.onDidClose(({ document }) => {
    const workspace = workspaceOf(document.uri);
    const path = workspace && pathOfUri(workspace, document.uri);
    if (workspace && path !== undefined) {
      workspace.setOpen(path, undefined);
    }
    void connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
  });

  connection.onCompletion(
    ({ textDocument, position }) =>
      withDocument(textDocument.uri, (workspace, document) => completions(workspace, document, position)) ?? [],
  );
  connection.onDefinition(({ textDocument, position }) =>
    withDocument(textDocument.uri, (workspace, document) => definition(workspace, document, position)),
  );
  connection.onHover(({ textDocument, position }) =>
    withDocument(textDocument.uri, (workspace, document) => hover(workspace, document, position)),
  );
  connection.onDocumentLinks(({ textDocument }) => withDocument(textDocument.uri, documentLinks) ?? []);
  connection.onDocumentSymbol(
    ({ textDocument }) => withDocument(textDocument.uri, (_, document) => documentSymbols(document)) ?? [],
  );
  connection.languages.inlayHint.on(({ textDocument }) => withDocument(textDocument.uri, inlayHints) ?? []);
  connection.onCodeLens(({ textDocument }) => withDocument(textDocument.uri, codeLenses) ?? []);
  connection.onRequest(VERDICT_LINES_REQUEST, ({ uri }: { uri: string }) => withDocument(uri, verdictLines) ?? []);

  documents.listen(connection);
  connection.listen();
};
