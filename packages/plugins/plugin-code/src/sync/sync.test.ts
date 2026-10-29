//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { findSourceKeys, formatSourceKey, parseGitHubRemote, parseSourceKey, reviewKeyOf } from '@dxos/deus/review';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { Text } from '@dxos/schema';
import { SpecDocument } from '@dxos/types';

import { detectRepo, parseGitConfigRemote, parseRepoEntry, resolvePath, resolveRoots } from './repo-roots.ts';
import { fromMetaKey, keyFromTreeUrl, toMetaKey } from './spec-key.ts';
import { SyncBases, reconcile, syncSpec } from './spec-sync.ts';

/** An in-memory file service; `roots` stands in for the dev server's own checkout. */
const memoryFs = (
  files: Record<string, string>,
  roots: { repo: string; path: string }[] = [],
): FileSystem.FileSystem => ({
  kind: 'dev',
  available: () => Effect.succeed(true),
  read: (path) => Effect.succeed(files[path]),
  write: (path, content) => Effect.sync(() => void (files[path] = content)),
  remove: (path) => Effect.sync(() => void delete files[path]),
  list: () => Effect.succeed([]),
  roots: () => Effect.succeed(roots),
});

describe('source keys', () => {
  test('parse and format round-trip, with and without a fragment', ({ expect }) => {
    const key = parseSourceKey('github:dxos/dxos/packages/sdk/types/src/types/Spec.ts#Spec.make');
    expect(key).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      path: 'packages/sdk/types/src/types/Spec.ts',
      fragment: 'Spec.make',
    });
    expect(key && formatSourceKey(key)).toBe('github:dxos/dxos/packages/sdk/types/src/types/Spec.ts#Spec.make');
    expect(key && formatSourceKey(key, false)).toBe('github:dxos/dxos/packages/sdk/types/src/types/Spec.ts');
    expect(parseSourceKey('packages/foo/SPEC.mdl')).toBeUndefined();
  });

  test('meta keys use the shape plugin-projects already writes', ({ expect }) => {
    const key = { owner: 'dxos', repo: 'dxos', path: 'packages/core/echo/echo/SPEC.mdl' };
    expect(toMetaKey(key)).toEqual({ source: 'github.com/dxos/dxos', id: 'packages/core/echo/echo/SPEC.mdl' });
    expect(fromMetaKey(toMetaKey(key))).toEqual(key);
    expect(fromMetaKey({ source: 'linear', id: 'DX-1' })).toBeUndefined();
  });

  test('finds keys in prose and trims sentence punctuation', ({ expect }) => {
    const text = 'Rests on `github:dxos/dxos/a/SPEC.mdl#Obj` and github:dxos/dxos/b/c.ts#make.';
    expect(findSourceKeys(text).map(({ raw }) => raw)).toEqual([
      'github:dxos/dxos/a/SPEC.mdl#Obj',
      'github:dxos/dxos/b/c.ts#make',
    ]);
  });

  test('derives review and bundled-spec keys', ({ expect }) => {
    expect(formatSourceKey(reviewKeyOf({ owner: 'o', repo: 'r', path: 'p/PLUGIN.mdl' }))).toBe(
      'github:o/r/p/PLUGIN.review.mdl',
    );
    expect(keyFromTreeUrl('https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code', 'PLUGIN.mdl')).toEqual(
      {
        owner: 'dxos',
        repo: 'dxos',
        path: 'packages/plugins/plugin-code/PLUGIN.mdl',
      },
    );
  });
});

describe('reconcile', () => {
  test('first link takes the file', ({ expect }) => {
    expect(reconcile({ local: 'echo', disk: 'disk' })).toEqual({ action: 'pull', status: 'pulled' });
  });

  test('agreement is a no-op', ({ expect }) => {
    expect(reconcile({ local: 'same', disk: 'same', base: 'old' })).toEqual({ action: 'none', status: 'synced' });
  });

  test('a change on one side flows to the other', ({ expect }) => {
    expect(reconcile({ local: 'base', disk: 'edited', base: 'base' })).toEqual({ action: 'pull', status: 'pulled' });
    expect(reconcile({ local: 'edited', disk: 'base', base: 'base' })).toEqual({ action: 'push', status: 'pushed' });
  });

  test('both changed is a conflict the file wins', ({ expect }) => {
    expect(reconcile({ local: 'a', disk: 'b', base: 'base' })).toEqual({ action: 'pull', status: 'conflict' });
  });
});

describe('repo roots', () => {
  test('parses GitHub remotes', ({ expect }) => {
    expect(parseGitHubRemote('git@github.com:dxos/dxos.git')).toBe('dxos/dxos');
    expect(parseGitHubRemote('https://github.com/dxos/edge')).toBe('dxos/edge');
    expect(parseGitHubRemote('https://gitlab.com/a/b')).toBeUndefined();
    expect(
      parseGitConfigRemote(
        '[core]\n\tbare = false\n[remote "upstream"]\n\turl = x\n[remote "origin"]\n\turl = git@github.com:a/b.git\n',
      ),
    ).toBe('git@github.com:a/b.git');
  });

  test('parses settings entries', ({ expect }) => {
    expect(parseRepoEntry('/src/dxos/')).toEqual({ path: '/src/dxos' });
    expect(parseRepoEntry('dxos/edge=/src/edge')).toEqual({ repo: 'dxos/edge', path: '/src/edge' });
    expect(parseRepoEntry('  ')).toBeUndefined();
  });

  test('detects a linked worktree through its gitdir', async ({ expect }) => {
    const fs = memoryFs({
      '/wt/.git': 'gitdir: /main/.git/worktrees/wt\n',
      '/main/.git/worktrees/wt/../../config': '[remote "origin"]\n\turl = git@github.com:dxos/dxos.git\n',
    });
    expect(await EffectEx.runPromise(detectRepo(fs, '/wt'))).toBe('dxos/dxos');
  });

  test('configured checkouts come before the host’s own and resolve keys', async ({ expect }) => {
    const fs = memoryFs({}, [{ repo: 'dxos/dxos', path: '/host' }]);
    const roots = await EffectEx.runPromise(resolveRoots(fs, ['dxos/edge=/src/edge']));
    expect(roots).toEqual([
      { repo: 'dxos/edge', path: '/src/edge' },
      { repo: 'dxos/dxos', path: '/host' },
    ]);
    expect(resolvePath(roots, { owner: 'dxos', repo: 'dxos', path: 'a/SPEC.mdl' })).toBe('/host/a/SPEC.mdl');
    expect(resolvePath(roots, { owner: 'other', repo: 'x', path: 'a' })).toBeUndefined();
    // A key from document text cannot climb out of its checkout.
    expect(resolvePath(roots, { owner: 'dxos', repo: 'dxos', path: '../etc/passwd' })).toBeUndefined();
    expect(resolvePath(roots, { owner: 'dxos', repo: 'dxos', path: 'a/../../b.mdl' })).toBeUndefined();
    expect(resolvePath(roots, { owner: 'dxos', repo: 'dxos', path: '/etc/passwd' })).toBeUndefined();
  });
});

describe('syncSpec', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a codec writes the file and reads it back, in place of copying the text', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [SpecDocument.SpecDocument, Text.Text] });
    const spec = db.add(SpecDocument.make({ content: 'a' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/SPEC.mdl' }));
    });
    const content = await spec.content.load();
    const codec: ProjectCapabilities.SpecDocumentCodec = {
      write: async (document) => `file:${(await document.content.load()).content}`,
      read: async (document, text) => {
        Doc.updateText(await document.content.load(), 'content', text.replace(/^file:/, ''));
        return true;
      },
    };
    const files: Record<string, string> = { '/host/a/SPEC.mdl': 'file:a' };
    const context = {
      fs: memoryFs(files),
      roots: [{ repo: 'dxos/dxos', path: '/host' }],
      bases: new SyncBases(),
      codecs: [codec],
    };
    const sync = () => EffectEx.runPromise(syncSpec(spec, context));

    expect((await sync()).status).toBe('synced');
    files['/host/a/SPEC.mdl'] = 'file:b';
    expect((await sync()).status).toBe('pulled');
    expect(content.content).toBe('b');
    Doc.updateText(content, 'content', 'c');
    expect((await sync()).status).toBe('pushed');
    expect(files['/host/a/SPEC.mdl']).toBe('file:c');
  });
});
