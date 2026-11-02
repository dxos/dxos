//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Filter, Obj, Ref, URI } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Text } from '@dxos/schema';
import { Repo } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import * as GitHubCapabilities from '../types/GitHubCapabilities.ts';
import { type FileMarker, type WriteState, fileKey, syncFileBinding } from './sync-files.ts';
import * as TextMerge from './TextMerge.ts';

//
// A fake api.github.com git database: refs, commits, trees and blobs, with ETags on refs, the
// non-forced ref update GitHub enforces, and pull requests. It records every request it answers.
//

type Tree = Map<string, string>;
type Commit = { tree: string; parents: string[]; message: string };

type FakeGit = {
  refs: Map<string, string>;
  commits: Map<string, Commit>;
  trees: Map<string, Tree>;
  blobs: Map<string, string>;
  pulls: { number: number; head: string; base: string }[];
  requests: string[];
  /** Runs before a ref update is applied, once; lets a test move the branch in between. */
  beforeRefUpdate?: () => void;
};

const blobSha = (content: string) => {
  const body = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${body.byteLength}\0`), body]))
    .digest('hex');
};
const hashOf = (value: unknown) => createHash('sha1').update(JSON.stringify(value)).digest('hex');

const putTree = (git: FakeGit, tree: Tree) => {
  const sha = hashOf([...tree.entries()].sort());
  git.trees.set(sha, new Map(tree));
  return sha;
};

const putCommit = (git: FakeGit, commit: Commit) => {
  const sha = hashOf(commit);
  git.commits.set(sha, commit);
  return sha;
};

const treeOf = (git: FakeGit, commit: string): Tree => git.trees.get(git.commits.get(commit)?.tree ?? '') ?? new Map();

/** Commits `files` (null deletes) onto `branch`, as a person pushing to GitHub would. */
const push = (git: FakeGit, branch: string, files: Record<string, string | null>, parents?: string[]) => {
  const tip = git.refs.get(branch);
  const tree = new Map(tip ? treeOf(git, tip) : []);
  for (const [path, content] of Object.entries(files)) {
    if (content === null) {
      tree.delete(path);
    } else {
      const sha = blobSha(content);
      git.blobs.set(sha, content);
      tree.set(path, sha);
    }
  }
  const commit = putCommit(git, { tree: putTree(git, tree), parents: parents ?? (tip ? [tip] : []), message: 'push' });
  git.refs.set(branch, commit);
  return commit;
};

const isAncestor = (git: FakeGit, ancestor: string, commit: string): boolean => {
  const queue = [commit];
  const seen = new Set<string>();
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (next === ancestor) {
      return true;
    }
    if (!seen.has(next)) {
      seen.add(next);
      queue.push(...(git.commits.get(next)?.parents ?? []));
    }
  }
  return false;
};

const TreeRequest = Schema.Struct({
  base_tree: Schema.String,
  tree: Schema.Array(
    Schema.Struct({ path: Schema.String, content: Schema.optional(Schema.String), sha: Schema.optional(Schema.Null) }),
  ),
});
const CommitRequest = Schema.Struct({
  message: Schema.String,
  tree: Schema.String,
  parents: Schema.Array(Schema.String),
});
const RefRequest = Schema.Struct({ ref: Schema.optional(Schema.String), sha: Schema.String });
const PullRequestRequest = Schema.Struct({ head: Schema.String, base: Schema.String });

const PREFIX = '/repos/dxos/composer';

const fakeFetch =
  (git: FakeGit): typeof globalThis.fetch =>
  async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    git.requests.push(`${request.method} ${path.replace(PREFIX, '')}`);
    const route = path.replace(PREFIX, '');

    if (request.method === 'GET' && route.startsWith('/git/ref/heads/')) {
      const sha = git.refs.get(route.slice('/git/ref/heads/'.length));
      if (!sha) {
        return new Response('Not Found', { status: 404 });
      }
      const etag = `"${sha}"`;
      return request.headers.get('if-none-match') === etag
        ? new Response(null, { status: 304 })
        : Response.json({ object: { sha } }, { headers: { etag } });
    }
    if (request.method === 'GET' && route.startsWith('/compare/')) {
      const [base, head] = route.slice('/compare/'.length).split('...');
      const before = treeOf(git, base);
      const after = treeOf(git, head);
      const files = [
        ...[...after].flatMap(([filename, sha]) =>
          before.get(filename) === sha ? [] : [{ filename, sha, status: before.has(filename) ? 'modified' : 'added' }],
        ),
        ...[...before.keys()]
          .filter((filename) => !after.has(filename))
          .map((filename) => ({ filename, status: 'removed' })),
      ];
      const status = base === head ? 'identical' : isAncestor(git, base, head) ? 'ahead' : 'diverged';
      return Response.json({ status, files });
    }
    if (request.method === 'GET' && route.startsWith('/git/trees/')) {
      const tree = treeOf(git, route.slice('/git/trees/'.length));
      return Response.json({
        sha: 'tree',
        tree: [...tree].map(([entry, sha]) => ({ path: entry, type: 'blob', sha, size: git.blobs.get(sha)?.length })),
      });
    }
    if (request.method === 'GET' && route.startsWith('/git/commits/')) {
      return Response.json({ tree: { sha: git.commits.get(route.slice('/git/commits/'.length))?.tree } });
    }
    if (request.method === 'GET' && route.startsWith('/git/blobs/')) {
      const content = git.blobs.get(route.slice('/git/blobs/'.length));
      return content === undefined ? new Response('Not Found', { status: 404 }) : new Response(content);
    }
    if (request.method === 'POST' && route === '/git/trees') {
      const body = Schema.decodeUnknownSync(TreeRequest)(await request.json());
      const tree = new Map(git.trees.get(body.base_tree));
      for (const entry of body.tree) {
        if (entry.content === undefined) {
          tree.delete(entry.path);
        } else {
          const sha = blobSha(entry.content);
          git.blobs.set(sha, entry.content);
          tree.set(entry.path, sha);
        }
      }
      return Response.json({ sha: putTree(git, tree) }, { status: 201 });
    }
    if (request.method === 'POST' && route === '/git/commits') {
      const body = Schema.decodeUnknownSync(CommitRequest)(await request.json());
      return Response.json({ sha: putCommit(git, { ...body, parents: [...body.parents] }) }, { status: 201 });
    }
    if (route === '/git/refs' || route.startsWith('/git/refs/heads/')) {
      const body = Schema.decodeUnknownSync(RefRequest)(await request.json());
      const hook = git.beforeRefUpdate;
      git.beforeRefUpdate = undefined;
      hook?.();
      const branch =
        route === '/git/refs' ? (body.ref ?? '').replace('refs/heads/', '') : route.slice('/git/refs/heads/'.length);
      const tip = git.refs.get(branch);
      const fastForward =
        request.method === 'POST' ? tip === undefined : tip !== undefined && isAncestor(git, tip, body.sha);
      if (!fastForward) {
        return Response.json({ message: 'Update is not a fast forward' }, { status: 422 });
      }
      git.refs.set(branch, body.sha);
      return Response.json({ object: { sha: body.sha } });
    }
    if (route === '/pulls') {
      if (request.method === 'GET') {
        const head = (url.searchParams.get('head') ?? '').replace('dxos:', '');
        return Response.json(
          git.pulls
            .filter((pull) => pull.head === head)
            .map((pull) => ({ number: pull.number, html_url: `https://github.com/dxos/composer/pull/${pull.number}` })),
        );
      }
      const body = Schema.decodeUnknownSync(PullRequestRequest)(await request.json());
      const number = 100 + git.pulls.length;
      git.pulls.push({ number, head: body.head, base: body.base });
      return Response.json({ number, html_url: `https://github.com/dxos/composer/pull/${number}` }, { status: 201 });
    }
    return new Response('Not Found', { status: 404 });
  };

//
// A mapping for plain-text files, built on TextMerge as a Text-backed mapping is.
//

const ImportText = Operation.make({
  meta: { key: DXN.make('com.example.operation.importText'), name: 'Import text' },
  input: GitHubCapabilities.FileImportInput,
  output: GitHubCapabilities.FileImportOutput,
  services: [Database.Service],
});

const ExportText = Operation.make({
  meta: { key: DXN.make('com.example.operation.exportText'), name: 'Export text' },
  input: GitHubCapabilities.FileExportInput,
  output: GitHubCapabilities.FileExportOutput,
  services: [Database.Service],
});

const importText = Effect.fn(function* (input: GitHubCapabilities.FileImportInput) {
  if (!input.object || !input.heads || input.base === undefined) {
    const text = yield* Database.add(Text.make({ content: input.content }));
    return { object: Ref.make(text), heads: TextMerge.currentHeads(text) };
  }
  const text = yield* Database.load(input.object);
  if (!Obj.instanceOf(Text.Text, text)) {
    return yield* Effect.die('not a text');
  }
  const heads = yield* TextMerge.applyAt(text, { base: input.base, next: input.content, heads: input.heads });
  return { object: input.object, heads };
});

const exportText = Effect.fn(function* (input: GitHubCapabilities.FileExportInput) {
  const text = yield* Database.load(input.object);
  if (!Obj.instanceOf(Text.Text, text)) {
    return yield* Effect.die('not a text');
  }
  return { content: text.content, heads: TextMerge.currentHeads(text) };
});

const MAPPING: GitHubCapabilities.FileMapping = {
  id: 'com.example.mapping.text',
  match: ['**/*.mdl'],
  type: Text.Text,
  import: ImportText,
  export: ExportText,
};

const SPEC_V1 = ['# Spec', '', 'F-1: one', 'F-2: two', 'F-3: three', ''].join('\n');

describe('plugin-github file sync (spec/FILE-SYNC.mdl)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([AccessToken.AccessToken, Connection.Connection, Cursor.Cursor, Repo.Repo, Text.Text]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: GITHUB_SOURCE, token: 'tok' }));
    const repo = db.add(
      Repo.make({ [Obj.Meta]: { keys: [{ source: GITHUB_SOURCE, id: '1234' }] }, owner: 'dxos', name: 'composer' }),
    );
    const binding = db.add(
      Cursor.makeExternal({
        source: Ref.make(token),
        target: Ref.make(repo),
        externalId: '1234',
        options: { stream: 'files', branch: 'main', writeBranch: 'composer/edits' },
      }),
    );
    if (!Cursor.isExternal(binding)) {
      throw new Error('expected external-sync cursor');
    }

    const git: FakeGit = {
      refs: new Map(),
      commits: new Map(),
      trees: new Map(),
      blobs: new Map(),
      pulls: [],
      requests: [],
    };
    push(git, 'main', { 'spec/PLUGIN.mdl': SPEC_V1, 'README.md': '# readme\n' });

    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>) =>
      effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    const operations: Operation.OperationService = {
      invoke: (operation, ...args) => {
        const input = args[0];
        const handle: Effect.Effect<unknown, unknown, Database.Service> =
          operation.meta.key === ImportText.meta.key && Schema.is(GitHubCapabilities.FileImportInput)(input)
            ? importText(input)
            : operation.meta.key === ExportText.meta.key && Schema.is(GitHubCapabilities.FileExportInput)(input)
              ? exportText(input)
              : Effect.fail(new Operation.NoHandlerError(operation.meta.key));
        return handle.pipe(
          Effect.flatMap((output) =>
            Schema.is(operation.output)(output) ? Effect.succeed(output) : Effect.die('unexpected output'),
          ),
          Effect.orDie,
          Effect.provide(Database.layer(db)),
        );
      },
      schedule: () => Effect.void,
      invokePromise: async () => ({ error: new Error('unused') }),
    };

    const services = Layer.mergeAll(
      Database.layer(db),
      Layer.succeed(Operation.Service, operations),
      Layer.succeed(Credential.CredentialsService, {
        queryCredentials: async () => [],
        getCredential: async () => {
          throw new Error('the token is stored on the object');
        },
      }),
    );

    /** One pass; `requests` lists only what this pass asked GitHub for. */
    const sync = async () => {
      git.requests = [];
      const result = await syncFileBinding(binding, [MAPPING]).pipe(
        Effect.provideService(FetchHttpClient.Fetch, fakeFetch(git)),
        Effect.provide(services),
        EffectEx.runAndForwardErrors,
      );
      return { result, requests: [...git.requests] };
    };

    const marker = (path: string) => Cursor.readSnapshot<FileMarker>(binding, `file:${path}`);
    const textAt = async (path: string) => {
      const uri = marker(path)?.object;
      if (!uri) {
        return undefined;
      }
      const object = await run(Database.resolve(URI.make(uri)));
      return Obj.instanceOf(Text.Text, object) ? object : undefined;
    };
    /** A Composer user editing the file's object. */
    const edit = async (path: string, update: (content: string) => string) => {
      const text = await textAt(path);
      if (!text) {
        throw new Error(`no object for ${path}`);
      }
      Doc.updateText(text, 'content', update(text.content));
    };
    const fileOn = (branch: string, path: string) => {
      const tip = git.refs.get(branch);
      const sha = tip ? treeOf(git, tip).get(path) : undefined;
      return sha ? git.blobs.get(sha) : undefined;
    };

    return { db, repo, binding, git, sync, marker, textAt, edit, fileOn, run };
  };

  test('the first pass imports every file a mapping claims, from the head tree', async ({ expect }) => {
    const { binding, git, sync, marker, textAt } = await setup();

    const { result, requests } = await sync();

    expect(requests).toEqual([
      'GET /git/ref/heads/main',
      'GET /git/trees/' + git.refs.get('main'),
      `GET /git/blobs/${blobSha(SPEC_V1)}`,
    ]);
    expect(result).toMatchObject({ pulled: 1, pushed: 0, skipped: [] });
    expect((await textAt('spec/PLUGIN.mdl'))?.content).toBe(SPEC_V1);
    expect(marker('README.md')).toBeUndefined();
    expect(marker('spec/PLUGIN.mdl')).toMatchObject({
      mapping: MAPPING.id,
      blob: blobSha(SPEC_V1),
      commit: git.refs.get('main'),
    });
    expect(binding.spec.token).toBe(git.refs.get('main'));
    const text = await textAt('spec/PLUGIN.mdl');
    expect(text && Obj.getKeys(text, GITHUB_SOURCE)).toEqual([fileKey('1234', 'spec/PLUGIN.mdl')]);
  });

  test('T-1: nothing changed costs one request, answered 304', async ({ expect }) => {
    const { binding, sync } = await setup();
    await sync();
    const before = { token: binding.spec.token, snapshots: JSON.stringify(binding.spec.snapshots) };

    const { result, requests } = await sync();

    expect(requests).toEqual(['GET /git/ref/heads/main']);
    expect(result).toMatchObject({ requests: 1, pulled: 0, pushed: 0 });
    expect({ token: binding.spec.token, snapshots: JSON.stringify(binding.spec.snapshots) }).toEqual(before);
  });

  test('T-2: a remote edit lands in the object and advances the marker', async ({ expect }) => {
    const { git, sync, marker, textAt } = await setup();
    await sync();
    const next = SPEC_V1.replace('F-2: two', 'F-2: two, revised');
    const head = push(git, 'main', { 'spec/PLUGIN.mdl': next });

    const { result, requests } = await sync();

    expect(requests).toEqual([
      'GET /git/ref/heads/main',
      `GET /compare/${git.commits.get(head)?.parents[0]}...${head}`,
      `GET /git/blobs/${blobSha(next)}`,
      `GET /git/blobs/${blobSha(SPEC_V1)}`,
    ]);
    expect(result).toMatchObject({ pulled: 1, pushed: 0 });
    expect((await textAt('spec/PLUGIN.mdl'))?.content).toBe(next);
    expect(marker('spec/PLUGIN.mdl')).toMatchObject({ blob: blobSha(next), commit: head });
  });

  test('T-3: concurrent edits merge in the object; the local one is committed to the write branch', async ({
    expect,
  }) => {
    const { git, binding, sync, edit, textAt, fileOn } = await setup();
    await sync();

    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-1: one', 'F-1: one, edited in Composer'));
    const head = push(git, 'main', { 'spec/PLUGIN.mdl': SPEC_V1.replace('F-3: three', 'F-3: three, edited on main') });

    const { result } = await sync();

    const merged = SPEC_V1.replace('F-1: one', 'F-1: one, edited in Composer').replace(
      'F-3: three',
      'F-3: three, edited on main',
    );
    expect((await textAt('spec/PLUGIN.mdl'))?.content).toBe(merged);
    expect(fileOn('composer/edits', 'spec/PLUGIN.mdl')).toBe(merged);
    expect(fileOn('composer/edits', 'README.md')).toBe('# readme\n');
    const tip = git.refs.get('composer/edits') ?? '';
    expect(git.commits.get(tip)?.parents).toEqual([head]);
    expect(result).toMatchObject({ pulled: 1, pushed: 1, pullRequest: { number: 100 } });
    expect(git.pulls).toEqual([{ number: 100, head: 'composer/edits', base: 'main' }]);

    // Later edits on both sides: the commit fast-forwards the write branch and merges the new main head.
    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-2: two', 'F-2: two, edited again'));
    const nextHead = push(git, 'main', { 'README.md': '# readme, revised\n' });
    const second = await sync();

    const nextTip = git.refs.get('composer/edits') ?? '';
    expect(git.commits.get(nextTip)?.parents).toEqual([tip, nextHead]);
    expect(fileOn('composer/edits', 'README.md')).toBe('# readme, revised\n');
    expect(fileOn('composer/edits', 'spec/PLUGIN.mdl')).toContain('F-2: two, edited again');
    expect(second.result).toMatchObject({ pushed: 1, pullRequest: { number: 100 } });
    expect(git.pulls).toHaveLength(1);
    expect(Cursor.readSnapshot<WriteState>(binding, 'state')?.lastWritten).toBe(nextTip);
  });

  test('T-4: a write branch that moves between read and write is read again and the commit retried', async ({
    expect,
  }) => {
    const { git, sync, edit, fileOn } = await setup();
    await sync();
    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-1: one', 'F-1: first'));
    await sync();

    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-2: two', 'F-2: second'));
    let moved = '';
    git.beforeRefUpdate = () => {
      moved = push(git, 'composer/edits', { 'NOTES.md': 'another client\n' });
    };
    const { result, requests } = await sync();

    expect(requests.filter((request) => request.startsWith('PATCH'))).toHaveLength(2);
    const tip = git.refs.get('composer/edits') ?? '';
    expect(git.commits.get(tip)?.parents[0]).toBe(moved);
    expect(fileOn('composer/edits', 'spec/PLUGIN.mdl')).toContain('F-2: second');
    expect(result).toMatchObject({ pushed: 1 });
  });

  test('T-5: a file removed upstream drops the marker and key but keeps the object', async ({ expect }) => {
    const { git, sync, marker, textAt, run } = await setup();
    await sync();
    const text = await textAt('spec/PLUGIN.mdl');
    push(git, 'main', { 'spec/PLUGIN.mdl': null });

    await sync();

    expect(marker('spec/PLUGIN.mdl')).toBeUndefined();
    expect(text && Obj.getKeys(text, GITHUB_SOURCE)).toEqual([]);
    const all = await run(Database.query(Filter.type(Text.Text)).run);
    expect(all.map((object) => object.id)).toContain(text?.id);
  });

  test('a merged pull request is adopted without applying its own edits twice', async ({ expect }) => {
    const { git, sync, edit, textAt, marker } = await setup();
    await sync();
    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-1: one', 'F-1: first'));
    await sync();
    const pushed = specOn(git, 'composer/edits');

    // The pull request merges, then main changes another line, while Composer edits a third.
    const mainTip = git.refs.get('main') ?? '';
    const writeTip = git.refs.get('composer/edits') ?? '';
    git.refs.set(
      'main',
      putCommit(git, { tree: git.commits.get(writeTip)?.tree ?? '', parents: [mainTip, writeTip], message: 'merge' }),
    );
    push(git, 'main', { 'spec/PLUGIN.mdl': (pushed ?? '').replace('F-3: three', 'F-3: third') });
    await edit('spec/PLUGIN.mdl', (content) => content.replace('F-2: two', 'F-2: second'));

    await sync();

    expect((await textAt('spec/PLUGIN.mdl'))?.content).toBe(
      SPEC_V1.replace('F-1: one', 'F-1: first').replace('F-2: two', 'F-2: second').replace('F-3: three', 'F-3: third'),
    );
    expect(marker('spec/PLUGIN.mdl')?.pushed?.blob).not.toBe(blobSha(pushed ?? ''));
  });
});

const specOn = (git: FakeGit, branch: string) => {
  const tip = git.refs.get(branch);
  const sha = tip ? treeOf(git, tip).get('spec/PLUGIN.mdl') : undefined;
  return sha ? git.blobs.get(sha) : undefined;
};
