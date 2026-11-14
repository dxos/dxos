//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import { findSourceKeys, formatSourceKey, parseGitHubRemote, parseSourceKey, reviewKeyOf } from '@dxos/deus/review';
import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import { Text } from '@dxos/schema';

import { Feature, FeatureMap, SpecText } from '#types';

import * as FrontMatter from './front-matter.ts';
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

describe('front matter', () => {
  test("a file's front matter becomes the spec's name and meta, and its text what follows", ({ expect }) => {
    const spec = Spec.make({ name: 'PLUGIN.mdl' });
    const text = FrontMatter.read(spec, '---\nid: org.example\nname: Example\nversion: 0.1.0\n---\n\nBody\n');
    expect(text).toBe('Body\n');
    expect(spec.name).toBe('Example');
    expect(Obj.getMeta(spec)).toMatchObject({ key: 'org.example', version: '0.1.0' });
  });

  test('writing rewrites only the keys the file has, keeping its other lines', ({ expect }) => {
    const spec = Spec.make({ name: 'Renamed', dialects: [FeatureMap.SOFTWARE_DIALECT] });
    const base = '---\nname: Example\nstatus: draft\n---\nOld\n';
    expect(FrontMatter.write(spec, 'New\n', base)).toBe('---\nname: Renamed\nstatus: draft\n---\nNew\n');
    expect(FrontMatter.write(spec, 'New\n', 'Old\n')).toBe('New\n');
    expect(FrontMatter.write(spec, 'New\n')).toBe('---\nname: Renamed\n---\n\nNew\n');
  });

  test("a file's `extends` is the spec's dialects, and a file that names none is a plugin's, read as software", ({
    expect,
  }) => {
    const dialects = (file: string) => {
      const spec = Spec.make({ name: 'Spec' });
      FrontMatter.read(spec, file);
      return [...spec.dialects];
    };
    expect(dialects('---\nextends:\n  - org.dxos.spec.video@1.0\n---\nBody\n')).toEqual(['org.dxos.spec.video']);
    expect(dialects('---\nname: Mail\n---\nBody\n')).toEqual([FeatureMap.SOFTWARE_DIALECT]);
    expect(dialects('---\nextends: [dxos.plugin.chess@0.1.0]\n---\nBody\n')).toEqual([FeatureMap.SOFTWARE_DIALECT]);
    expect(dialects('Body\n')).toEqual([FeatureMap.SOFTWARE_DIALECT]);
  });

  test('a pull takes from the front matter only what the file changed since the last sync, and fills unset fields', ({
    expect,
  }) => {
    const base = '---\nname: Launch\n---\nOld\n';
    const spec = Spec.make({ name: 'Local', dialects: ['org.dxos.spec.video'] });
    FrontMatter.read(spec, '---\nname: Launch\n---\nNew\n', base);
    expect([spec.name, [...spec.dialects]]).toEqual(['Local', ['org.dxos.spec.video']]);
    FrontMatter.read(spec, '---\nname: Launched\nextends: [org.dxos.spec.qa]\n---\nNew\n', base);
    expect([spec.name, [...spec.dialects]]).toEqual(['Launched', ['org.dxos.spec.qa']]);
    const unset = Spec.make({ name: 'Mail' });
    const keyed = '---\nid: org.example.mail\nname: Launch\n---\nOld\n';
    FrontMatter.read(unset, keyed, keyed);
    expect([unset.name, [...unset.dialects], Obj.getMeta(unset).key]).toEqual([
      'Mail',
      [FeatureMap.SOFTWARE_DIALECT],
      'org.example.mail',
    ]);
  });

  test('a commented value reads without its comment, and writing it back keeps the line as it was', ({ expect }) => {
    const file = '---\nname: Launch # shown in Composer\n---\nBody\n';
    const spec = Spec.make({ name: 'PLUGIN.mdl', dialects: [FeatureMap.SOFTWARE_DIALECT] });
    FrontMatter.read(spec, file);
    expect(spec.name).toBe('Launch');
    expect(FrontMatter.write(spec, 'Body\n', file)).toBe(file);
    FrontMatter.read(spec, '---\nname: C# guide\n---\nBody\n');
    expect(spec.name).toBe('C# guide');
    FrontMatter.read(spec, '---\nname:\n---\nBody\n');
    expect(spec.name).toBe('C# guide');
    Obj.update(spec, (spec) => {
      spec.name = 'Sprint #3: plan';
    });
    const written = FrontMatter.write(spec, 'Body\n', file);
    expect(written).toBe('---\nname: "Sprint #3: plan" # shown in Composer\n---\nBody\n');
    const copy = Spec.make({ name: 'copy.mdl' });
    FrontMatter.read(copy, written);
    expect(copy.name).toBe('Sprint #3: plan');
  });

  test("writing `extends` writes the spec's dialects and keeps the specs it names besides them", ({ expect }) => {
    const spec = Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video'] });
    expect(
      FrontMatter.write(spec, 'New\n', '---\nextends: [dxos.plugin.chess@0.1.0, org.dxos.spec.software]\n---\nOld\n'),
    ).toBe('---\nextends: [dxos.plugin.chess@0.1.0, org.dxos.spec.video]\n---\nNew\n');
    expect(
      FrontMatter.write(spec, 'New\n', '---\nextends:\n  - org.dxos.spec.software@1.0\nname: Launch\n---\nOld\n'),
    ).toBe('---\nextends:\n  - org.dxos.spec.video\nname: Launch\n---\nNew\n');
    const listed = '---\nextends:\n  - org.dxos.spec.video@1.0\n---\nOld\n';
    expect(FrontMatter.write(spec, 'New\n', listed)).toBe('---\nextends:\n  - org.dxos.spec.video@1.0\n---\nNew\n');
    expect(FrontMatter.write(spec, 'New\n', '---\nname: Launch\n---\nOld\n')).toBe(
      '---\nname: Launch\nextends: [org.dxos.spec.video]\n---\nNew\n',
    );
    expect(FrontMatter.write(spec, 'New\n')).toBe('---\nname: Launch\nextends: [org.dxos.spec.video]\n---\n\nNew\n');
    const software = Spec.make({ name: 'Mail', dialects: [FeatureMap.SOFTWARE_DIALECT] });
    expect(FrontMatter.write(software, 'New\n', '---\nname: Mail\n---\nOld\n')).toBe('---\nname: Mail\n---\nNew\n');
  });

  test('a pull of a file whose front matter does not parse takes nothing from it', ({ expect }) => {
    const base = '---\nextends: [org.dxos.spec.video]\n---\nOld\n';
    const spec = Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video'] });
    const file = '---\nname: Launch: v2\nextends: [org.dxos.spec.video]\n---\nNew\n';
    expect(FrontMatter.read(spec, file, base)).toBe('New\n');
    expect([spec.name, [...spec.dialects]]).toEqual(['Launch', ['org.dxos.spec.video']]);
  });

  test('an id the build does not know is written to `extends` once, however often the spec is written', ({
    expect,
  }) => {
    const spec = Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video', 'org.example.gone'] });
    const once = FrontMatter.write(spec, 'Body\n', '---\nextends: [org.dxos.spec.video]\n---\nBody\n');
    expect(once).toBe('---\nextends: [org.dxos.spec.video, org.example.gone]\n---\nBody\n');
    expect(FrontMatter.write(spec, 'Body\n', once)).toBe(once);
  });

  test('a last synced file whose front matter did not parse counts as none, so a pull takes the file', ({ expect }) => {
    const spec = Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video'] });
    FrontMatter.read(spec, '---\nname: Launch v2\nid: org.x\n---\nBody\n', '---\nname: Launch: v2\n---\nBody\n');
    expect([spec.name, Obj.getMeta(spec).key]).toEqual(['Launch v2', 'org.x']);
  });

  test('a file that lists an id twice still gets the dialects it lacks, each once', ({ expect }) => {
    const spec = Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video', 'org.dxos.spec.qa'] });
    const base = '---\nextends: [org.dxos.spec.video, org.dxos.spec.video]\n---\nBody\n';
    expect(FrontMatter.write(spec, 'Body\n', base)).toBe(
      '---\nextends: [org.dxos.spec.video, org.dxos.spec.qa]\n---\nBody\n',
    );
  });

  test('a spec whose dialects are unset writes no `extends`, and keeps the one its file has', ({ expect }) => {
    const spec = Spec.make({ name: 'Notes' });
    expect(FrontMatter.write(spec, 'New\n', '---\nname: Notes\n---\nOld\n')).toBe('---\nname: Notes\n---\nNew\n');
    const video = '---\nextends: [org.dxos.spec.video]\n---\n';
    expect(FrontMatter.write(spec, 'New\n', `${video}Old\n`)).toBe(`${video}New\n`);
    expect(FrontMatter.write(spec, 'New\n')).toBe('---\nname: Notes\n---\n\nNew\n');
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

  test("a file of feat blocks becomes the spec's features, written back as blocks", async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Spec.Spec, Feature.Feature, Text.Text],
    });
    const spec = db.add(Spec.make({ name: 'a/SPEC.mdl', content: '' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/SPEC.mdl' }));
    });
    const file = [
      '# A',
      '',
      '```mdl',
      'feat F-1: Sync',
      '',
      '  req F-1.1:',
      '    when: mail arrives',
      '    then: it shows',
      '```',
      '',
    ].join('\n');
    const files: Record<string, string> = { '/host/a/SPEC.mdl': file };
    const context = {
      fs: memoryFs(files),
      roots: [{ repo: 'dxos/dxos', path: '/host' }],
      bases: new SyncBases(),
      codecs: [SpecText.codec],
    };
    const sync = () => EffectEx.runPromise(syncSpec(spec, context));

    expect((await sync()).status).toBe('pulled');
    const [feature] = await Ref.loadAll(FeatureMap.getFeatures(spec));
    expect(feature.name).toBe('Sync');
    expect((await spec.content.load()).content).not.toContain('feat F-1');

    Obj.update(feature, (feature) => {
      feature.status = 'operational';
    });
    expect((await sync()).status).toBe('pushed');
    expect(files['/host/a/SPEC.mdl']).toBe(file.replace('feat F-1: Sync\n', 'feat F-1: Sync\n  status: operational\n'));

    files['/host/a/SPEC.mdl'] = files['/host/a/SPEC.mdl'].replace('feat F-1: Sync', 'feat F-1: Sync everywhere');
    expect((await sync()).status).toBe('pulled');
    expect(feature.name).toBe('Sync everywhere');
  });

  test('a first link takes the file into the fields and its body into the text, and later field edits reach the file', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const file = '---\nid: org.example.launch\nextends: [org.dxos.spec.video]\n---\nBody\n';
    const spec = db.add(Spec.make({ name: 'Launch', content: file }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/PLUGIN.mdl' }));
    });
    const files: Record<string, string> = { '/host/a/PLUGIN.mdl': file };
    const context = { fs: memoryFs(files), roots: [{ repo: 'dxos/dxos', path: '/host' }], bases: new SyncBases() };
    const sync = () => EffectEx.runPromise(syncSpec(spec, context));

    await sync();
    expect([(await spec.content.load()).content, [...spec.dialects], Obj.getMeta(spec).key]).toEqual([
      'Body\n',
      ['org.dxos.spec.video'],
      'org.example.launch',
    ]);
    Obj.update(spec, (spec) => {
      spec.dialects.push(FeatureMap.SOFTWARE_DIALECT);
    });
    expect((await sync()).status).toBe('pushed');
    expect(files['/host/a/PLUGIN.mdl']).toBe(file.replace(']', ', org.dxos.spec.software]'));
    expect([...spec.dialects]).toEqual(['org.dxos.spec.video', FeatureMap.SOFTWARE_DIALECT]);
    files['/host/a/PLUGIN.mdl'] = file.replace('org.dxos.spec.video', 'org.dxos.spec.qa');
    expect((await sync()).status).toBe('pulled');
    expect([...spec.dialects]).toEqual(['org.dxos.spec.qa']);
  });

  test("a first link takes the file's front matter into the fields whatever the spec's text starts with", async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(
      Spec.make({ name: 'Launch', dialects: ['org.dxos.spec.video'], content: '---\nname: a: b\n---\nBody\n' }),
    );
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/PLUGIN.mdl' }));
    });
    const file = '---\nname: Launch v2\nextends: [org.dxos.spec.qa]\n---\nBody\n';
    const files: Record<string, string> = { '/host/a/PLUGIN.mdl': file };
    const context = { fs: memoryFs(files), roots: [{ repo: 'dxos/dxos', path: '/host' }], bases: new SyncBases() };
    const sync = () => EffectEx.runPromise(syncSpec(spec, context));

    expect((await sync()).status).toBe('pulled');
    expect([(await spec.content.load()).content, spec.name, [...spec.dialects]]).toEqual([
      'Body\n',
      'Launch v2',
      ['org.dxos.spec.qa'],
    ]);
    expect((await sync()).status).toBe('synced');
    expect(files['/host/a/PLUGIN.mdl']).toBe(file);
  });

  test("a block at the top of a spec's text is its body: it follows the front matter and sets no field", async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(Spec.make({ name: 'Launch', content: 'Body\n' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/PLUGIN.mdl' }));
    });
    const bases = new SyncBases();
    const typed = '---\nname: X\n---\n\nBody\n';
    for (const file of ['---\nname: Launch\n---\n\nBody\n', 'Body\n']) {
      const files: Record<string, string> = { '/host/a/PLUGIN.mdl': file };
      await EffectEx.runPromise(bases.set(spec.id, file));
      const context = { fs: memoryFs(files), roots: [{ repo: 'dxos/dxos', path: '/host' }], bases };
      const sync = () => EffectEx.runPromise(syncSpec(spec, context));
      Doc.updateText(await spec.content.load(), ['content'], typed);
      expect((await sync()).status, file).toBe('pushed');
      expect((await sync()).status, file).toBe('synced');
      expect([files['/host/a/PLUGIN.mdl'], spec.name], file).toEqual([`---\nname: Launch\n---\n\n${typed}`, 'Launch']);
    }
  });

  test('a spec in step with its file takes the dialects and key it has not set', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(Spec.make({ name: 'Launch', content: 'Body\n' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/PLUGIN.mdl' }));
    });
    const file = '---\nid: org.example.launch\nextends: [org.dxos.spec.video]\n---\nBody\n';
    const bases = new SyncBases();
    await EffectEx.runPromise(bases.set(spec.id, file));
    const context = {
      fs: memoryFs({ '/host/a/PLUGIN.mdl': file }),
      roots: [{ repo: 'dxos/dxos', path: '/host' }],
      bases,
    };

    expect((await EffectEx.runPromise(syncSpec(spec, context))).status).toBe('synced');
    expect([[...spec.dialects], Obj.getMeta(spec).key]).toEqual([['org.dxos.spec.video'], 'org.example.launch']);
  });

  /** A spec linked to `file`, its text `text` and its last synced file `base` (none when undefined). */
  const linked = async (
    file: string,
    { text, base, name = 'Launch' }: { text: string; base?: string; name?: string },
  ) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(Spec.make({ name, content: text }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push(toMetaKey({ owner: 'dxos', repo: 'dxos', path: 'a/PLUGIN.mdl' }));
    });
    const files: Record<string, string> = { '/host/a/PLUGIN.mdl': file };
    const bases = new SyncBases();
    if (base !== undefined) {
      await EffectEx.runPromise(bases.set(spec.id, base));
    }
    const context = { fs: memoryFs(files), roots: [{ repo: 'dxos/dxos', path: '/host' }], bases };
    const sync = async () => (await EffectEx.runPromise(syncSpec(spec, context))).status;
    return { spec, files, bases, sync };
  };

  test('a file whose front matter does not parse is an error: the pass changes nothing and records no base', async ({
    expect,
  }) => {
    const file = '---\nname: Launch\n---\n\nBody\n';
    const { spec, files, bases, sync } = await linked(file, { text: 'Body\n', base: file });
    const broken = '---\nname: Launch: v2\n---\n\nBody, edited\n';
    files['/host/a/PLUGIN.mdl'] = broken;
    Obj.update(spec, (spec) => {
      spec.name = 'Renamed';
    });
    expect(await sync()).toBe('error');
    expect([files['/host/a/PLUGIN.mdl'], (await spec.content.load()).content, spec.name]).toEqual([
      broken,
      'Body\n',
      'Renamed',
    ]);
    expect(await EffectEx.runPromise(bases.get(spec.id))).toBe(file);
  });

  test('a file fixed and renamed in one save gives the spec its new name', async ({ expect }) => {
    const file = '---\nname: Launch\n---\n\nBody\n';
    const { spec, files, sync } = await linked(file, { text: 'Body\n', base: file });
    files['/host/a/PLUGIN.mdl'] = '---\nname: Launch: v2\n---\n\nBody\n';
    await sync();
    files['/host/a/PLUGIN.mdl'] = '---\nname: Launch v2\n---\n\nBody\n';
    expect(await sync()).toBe('pulled');
    expect(await sync()).toBe('synced');
    expect([spec.name, files['/host/a/PLUGIN.mdl']]).toEqual(['Launch v2', '---\nname: Launch v2\n---\n\nBody\n']);
  });

  test("a text that still holds a copy of its file's front matter loses it, and the file keeps one", async ({
    expect,
  }) => {
    const file = '---\nid: org.x\nname: Launch\nextends: [org.dxos.spec.video]\n---\n\nBody\n';
    const { spec, files, sync } = await linked(file, { text: file, base: file, name: 'a/PLUGIN.mdl' });
    expect(await sync()).toBe('synced');
    expect(await sync()).toBe('synced');
    expect([files['/host/a/PLUGIN.mdl'], (await spec.content.load()).content]).toEqual([file, 'Body\n']);
    expect([Obj.getMeta(spec).key, [...spec.dialects]]).toEqual(['org.x', ['org.dxos.spec.video']]);
  });
});
