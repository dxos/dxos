//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';
import {
  type Diagnostic,
  type DocumentLink,
  type Hover,
  type InlayHint,
  type ProtocolConnection,
  PublishDiagnosticsNotification,
  StreamMessageReader,
  StreamMessageWriter,
  createConnection,
  createProtocolConnection,
} from 'vscode-languageserver/node';

import { VERDICT_LINES_REQUEST, startServer } from './server.ts';
import { FILES, hoverText } from './testing/fixture.ts';

describe('server', () => {
  let root: string;
  let client: ProtocolConnection;
  const diagnostics = new Map<string, Diagnostic[]>();
  const uri = (path: string) => pathToFileURL(join(root, path)).href;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'mdl-ls-'));
    for (const [path, text] of Object.entries(FILES)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    const toServer = new PassThrough();
    const toClient = new PassThrough();
    startServer(createConnection(new StreamMessageReader(toServer), new StreamMessageWriter(toClient)));
    client = createProtocolConnection(new StreamMessageReader(toClient), new StreamMessageWriter(toServer));
    client.onNotification(PublishDiagnosticsNotification.type, ({ uri, diagnostics: found }) =>
      diagnostics.set(uri, found),
    );
    client.listen();
    await client.sendRequest('initialize', {
      processId: null,
      rootUri: pathToFileURL(root).href,
      capabilities: {},
      workspaceFolders: [{ uri: pathToFileURL(root).href, name: 'repo' }],
    });
    await client.sendNotification('initialized', {});
    await client.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: uri('packages/a/SPEC.mdl'),
        languageId: 'mdl',
        version: 1,
        text: FILES['packages/a/SPEC.mdl'],
      },
    });
  });

  afterAll(() => {
    client?.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  test('publishes diagnostics for an open spec', async ({ expect }) => {
    // The temp checkout has no remote, so no key is known to be local and only the lint applies.
    await expect
      .poll(() => diagnostics.get(uri('packages/a/SPEC.mdl'))?.map(({ source }) => source), { timeout: 4_000 })
      .toEqual(['mdl/block-type']);
  });

  test('answers hovers, inlay hints and verdict lines from the review on disk', async ({ expect }) => {
    const textDocument = { uri: uri('packages/a/SPEC.mdl') };
    const hover: Hover | null = await client.sendRequest('textDocument/hover', {
      textDocument,
      position: { line: 16, character: 4 },
    });
    expect(hoverText(hover)).toContain('**Done** — The action is registered.');

    const hints: InlayHint[] = await client.sendRequest('textDocument/inlayHint', {
      textDocument,
      range: { start: { line: 0, character: 0 }, end: { line: 40, character: 0 } },
    });
    expect(hints.map(({ position }) => position.line)).toEqual([16, 21]);

    expect(await client.sendRequest(VERDICT_LINES_REQUEST, { uri: textDocument.uri })).toEqual([
      { line: 16, status: 'done' },
      { line: 21, status: 'missing' },
    ]);
  });
});

describe('two checkouts in one window', () => {
  let dxos: string;
  let edge: string;
  let client: ProtocolConnection;
  const spec = 'packages/a/SPEC.mdl';
  const specText = ['---', 'id: org.dxos.spec.a', '---', '', 'See github:dxos/edge/src/main.ts#run.', ''].join('\n');

  /** A checkout with an `origin` remote, which is what matches a key's `owner/repo` to a folder. */
  const checkout = (repo: string, files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), 'mdl-ls-'));
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['remote', 'add', 'origin', `https://github.com/dxos/${repo}.git`], { cwd: root });
    return root;
  };

  beforeAll(async () => {
    dxos = checkout('dxos', { [spec]: specText });
    edge = checkout('edge', { 'src/main.ts': 'export const run = () => {};\n' });
    const toServer = new PassThrough();
    const toClient = new PassThrough();
    startServer(createConnection(new StreamMessageReader(toServer), new StreamMessageWriter(toClient)));
    client = createProtocolConnection(new StreamMessageReader(toClient), new StreamMessageWriter(toServer));
    client.listen();
    await client.sendRequest('initialize', {
      processId: null,
      capabilities: {},
      workspaceFolders: [
        { uri: pathToFileURL(dxos).href, name: 'dxos' },
        { uri: pathToFileURL(edge).href, name: 'edge' },
      ],
    });
    await client.sendNotification('initialized', {});
    await client.sendNotification('textDocument/didOpen', {
      textDocument: { uri: pathToFileURL(join(dxos, spec)).href, languageId: 'mdl', version: 1, text: specText },
    });
  });

  afterAll(() => {
    client?.dispose();
    rmSync(dxos, { recursive: true, force: true });
    rmSync(edge, { recursive: true, force: true });
  });

  test('a key into the other checkout opens its file, not GitHub', async ({ expect }) => {
    const links: DocumentLink[] = await client.sendRequest('textDocument/documentLink', {
      textDocument: { uri: pathToFileURL(join(dxos, spec)).href },
    });
    expect(links.map(({ target }) => target)).toEqual([`${pathToFileURL(join(edge, 'src/main.ts')).href}#L1`]);
  });
});
