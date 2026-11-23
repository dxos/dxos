//
// Copyright 2026 DXOS.org
//

import {
  type DecorationOptions,
  type ExtensionContext,
  OverviewRulerLane,
  Range,
  type TextEditor,
  type TextEditorDecorationType,
  Uri,
  commands,
  env,
  window,
  workspace,
} from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

/** Custom request and notification of `@dxos/mdl-language-server` (`src/server.ts`). */
const VERDICT_LINES_REQUEST = 'mdl/verdictLines';
const REVIEW_CHANGED_NOTIFICATION = 'mdl/reviewChanged';

/** The command the server's code lenses run; it is not in the palette. */
const OPEN_COMMAND = 'mdl.open';

const STATUSES = ['done', 'untested', 'partial', 'diverged', 'missing'] as const;

type VerdictStatus = (typeof STATUSES)[number];

/** The spec viewer's margin colours (plugin-code `review-gutter.ts`). */
const STATUS_COLOR: Record<VerdictStatus, string> = {
  done: '#16a34a',
  untested: '#2563eb',
  partial: '#d97706',
  diverged: '#ea580c',
  missing: '#dc2626',
};

const isStatus = (value: unknown): value is VerdictStatus => STATUSES.some((status) => status === value);

/** The `{ line, status }` rows of the verdict-lines request; anything else is dropped. */
const parseVerdictLines = (value: unknown): { line: number; status: VerdictStatus }[] =>
  Array.isArray(value)
    ? value.flatMap((row: unknown) =>
        typeof row === 'object' &&
        row !== null &&
        'line' in row &&
        'status' in row &&
        typeof row.line === 'number' &&
        isStatus(row.status)
          ? [{ line: row.line, status: row.status }]
          : [],
      )
    : [];

let client: LanguageClient | undefined;

const setting = <T>(key: string, fallback: T): T => workspace.getConfiguration('mdl').get<T>(key) ?? fallback;

/** Colours each reviewed item's line in the margin and the overview ruler by its verdict, as the spec viewer does. */
const createGutter = (context: ExtensionContext, languageClient: LanguageClient) => {
  const decoration = (color: string) =>
    window.createTextEditorDecorationType({
      isWholeLine: true,
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      borderColor: color,
      overviewRulerColor: color,
      overviewRulerLane: OverviewRulerLane.Left,
    });
  const decorations: Record<VerdictStatus, TextEditorDecorationType> = {
    done: decoration(STATUS_COLOR.done),
    untested: decoration(STATUS_COLOR.untested),
    partial: decoration(STATUS_COLOR.partial),
    diverged: decoration(STATUS_COLOR.diverged),
    missing: decoration(STATUS_COLOR.missing),
  };
  context.subscriptions.push(...Object.values(decorations));

  const update = async (editor: TextEditor | undefined) => {
    if (!editor || editor.document.languageId !== 'mdl') {
      return;
    }
    const rows = setting('review.gutter', true)
      ? parseVerdictLines(
          await languageClient.sendRequest(VERDICT_LINES_REQUEST, { uri: editor.document.uri.toString() }),
        )
      : [];
    for (const status of STATUSES) {
      const ranges: DecorationOptions[] = rows
        .filter((row) => row.status === status)
        .map(({ line }) => ({ range: new Range(line, 0, line, 0) }));
      editor.setDecorations(decorations[status], ranges);
    }
  };
  const updateVisible = () => window.visibleTextEditors.forEach((editor) => void update(editor));

  let timer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    window.onDidChangeVisibleTextEditors(updateVisible),
    workspace.onDidChangeTextDocument(({ document }) => {
      if (document.languageId === 'mdl') {
        clearTimeout(timer);
        timer = setTimeout(updateVisible, 300);
      }
    }),
    workspace.onDidChangeConfiguration((event) => event.affectsConfiguration('mdl.review') && updateVisible()),
    languageClient.onNotification(REVIEW_CHANGED_NOTIFICATION, updateVisible),
  );
  updateVisible();
};

/** Opens a location the server names: a file at a 0-based line, or a URL in the browser. */
const open = async (target: string, line = 0) => {
  const uri = Uri.parse(target);
  if (uri.scheme === 'http' || uri.scheme === 'https') {
    await env.openExternal(uri);
    return;
  }
  await window.showTextDocument(uri, { selection: new Range(line, 0, line, 0) });
};

export const activate = async (context: ExtensionContext): Promise<void> => {
  const module = setting('server.path', '') || context.asAbsolutePath('dist/server.cjs');
  const serverOptions: ServerOptions = {
    run: { module, transport: TransportKind.ipc },
    debug: { module, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'mdl' }],
    middleware: {
      // The review shows as code lenses by default; inlay hints carry the same chips for those who prefer them inline.
      provideInlayHints: (document, range, token, next) =>
        setting('review.inlayHints', false) ? next(document, range, token) : [],
      provideCodeLenses: (document, token, next) => (setting('review.codeLens', true) ? next(document, token) : []),
    },
  };

  client = new LanguageClient('mdl', 'DEUS MDL', serverOptions, clientOptions);
  context.subscriptions.push(
    commands.registerCommand(OPEN_COMMAND, open),
    commands.registerCommand('mdl.restartServer', () => client?.restart()),
  );
  await client.start();
  createGutter(context, client);
};

export const deactivate = (): Promise<void> | undefined => client?.stop();
