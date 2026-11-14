//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as TextMerge from '@dxos/plugin-github/TextMerge';
import { Text } from '@dxos/schema';
import { Repo } from '@dxos/types';

import { FeatureMap } from '#types';

import exportSpecFile from './export-spec-file.ts';
import importSpecFile from './import-spec-file.ts';
import { loadSpecText } from './spec-file.ts';

const BODY = ['F-1: one', 'F-2: two', 'F-3: three', ''].join('\n');
const SPEC = ['---', 'id: org.example', '---', '', BODY].join('\n');

const capabilities = () => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  return manager;
};

describe('Spec file mapping (plugin-github spec/FILE-SYNC.mdl F-6)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Repo.Repo, Spec.Spec, Text.Text]);
    const repo = db.add(Repo.make({ owner: 'dxos', name: 'composer' }));
    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service | Capability.Service>) =>
      effect.pipe(
        Effect.provide(Database.layer(db)),
        Effect.provideService(Capability.Service, capabilities()),
        EffectEx.runAndForwardErrors,
      );
    return { db, repo, run };
  };

  test('a remote change merges with a local edit made since the last sync', async ({ expect }) => {
    const { db, repo, run } = await setup();

    const created = await run(
      importSpecFile.handler({
        repository: Ref.make(repo),
        path: 'packages/plugins/plugin-code/PLUGIN.mdl',
        content: SPEC,
      }),
    );
    const spec = await run(Database.load(created.object));
    invariant(Spec.instanceOf(spec), 'Missing spec.');
    expect(spec.name).toBe('plugin-code/PLUGIN.mdl');
    // The front matter is the spec's meta, and the text holds what follows it.
    expect(Obj.getMeta(spec).key).toBe('org.example');
    const { text } = await run(loadSpecText(created.object));
    expect(text.content).toBe(BODY);

    // A Composer user edits F-1; meanwhile the file's F-3 changed on GitHub.
    Doc.updateText(text, 'content', text.content.replace('F-1: one', 'F-1: one, local'));
    const remote = SPEC.replace('F-3: three', 'F-3: three, remote');
    const merged = await run(
      importSpecFile.handler({
        repository: Ref.make(repo),
        path: 'packages/plugins/plugin-code/PLUGIN.mdl',
        content: remote,
        base: SPEC,
        object: created.object,
        heads: created.heads,
      }),
    );

    const file = SPEC.replace('F-1: one', 'F-1: one, local').replace('F-3: three', 'F-3: three, remote');
    expect(text.content).toBe(BODY.replace('F-1: one', 'F-1: one, local').replace('F-3: three', 'F-3: three, remote'));
    const exported = await run(exportSpecFile.handler({ object: merged.object, path: 'PLUGIN.mdl', base: remote }));
    expect(exported.content).toBe(file);
  });

  test("a file from a checkout is read as software, as a plugin's bundled spec is", async ({ expect }) => {
    const { repo, run } = await setup();
    const path = 'packages/plugins/plugin-mail/PLUGIN.mdl';
    const created = await run(importSpecFile.handler({ repository: Ref.make(repo), path, content: '# Mail\n' }));
    const spec = await run(Database.load(created.object));
    invariant(Spec.instanceOf(spec), 'Missing spec.');
    expect(spec.dialects).toEqual([FeatureMap.SOFTWARE_DIALECT]);
  });

  test('an export first takes the fields the spec has not set from the file as GitHub holds it', async ({ expect }) => {
    const { db, run } = await setup();
    const spec = db.add(Spec.make({ name: 'Launch', content: 'Body\n' }));
    const base = '---\nid: org.example.launch\nextends: [org.dxos.spec.video]\n---\nBody\n';
    const exported = await run(exportSpecFile.handler({ object: Ref.make(spec), path: 'launch.mdl', base }));
    expect(exported.content).toBe(base);
    expect([[...spec.dialects], Obj.getMeta(spec).key]).toEqual([['org.dxos.spec.video'], 'org.example.launch']);
  });

  test('a file whose front matter does not parse is neither imported nor exported', async ({ expect }) => {
    const { db, repo, run } = await setup();
    const broken = '---\nname: Launch: v2\n---\n\nBody\n';
    await expect(
      run(importSpecFile.handler({ repository: Ref.make(repo), path: 'launch.mdl', content: broken })),
    ).rejects.toThrow(/does not parse/);
    const spec = db.add(Spec.make({ name: 'Launch', content: 'Body\n' }));
    await expect(
      run(exportSpecFile.handler({ object: Ref.make(spec), path: 'launch.mdl', base: broken })),
    ).rejects.toThrow(/does not parse/);
  });

  test("an import into a text that still holds its file's front matter moves it into the fields first", async ({
    expect,
  }) => {
    const { db, repo, run } = await setup();
    const file = '---\nid: org.example.launch\nname: Launch\nversion: 0.1.0\n---\n\nBody\n';
    const spec = db.add(Spec.make({ name: 'a/launch.mdl', content: file }));
    const { text } = await run(loadSpecText(Ref.make(spec)));
    const remote = file.replace('0.1.0', '0.2.0').replace('Body', 'Body, remote');
    await run(
      importSpecFile.handler({
        repository: Ref.make(repo),
        path: 'a/launch.mdl',
        content: remote,
        base: file,
        object: Ref.make(spec),
        heads: TextMerge.currentHeads(text),
      }),
    );
    expect([spec.name, Obj.getMeta(spec).version, text.content]).toEqual(['Launch', '0.2.0', 'Body, remote\n']);
    const exported = await run(exportSpecFile.handler({ object: Ref.make(spec), path: 'a/launch.mdl', base: remote }));
    expect(exported.content).toBe(remote);
  });

  test('an export writes a block at the top of the text as body, after the front matter', async ({ expect }) => {
    const { db, run } = await setup();
    const spec = db.add(Spec.make({ name: 'Launch', content: '---\nname: X\n---\n\nBody\n' }));
    const base = '---\nname: Launch\nid: org.x\n---\n\nBody\n';
    const exported = await run(exportSpecFile.handler({ object: Ref.make(spec), path: 'launch.mdl', base }));
    expect([exported.content, spec.name]).toEqual([base.replace('Body', '---\nname: X\n---\n\nBody'), 'Launch']);
  });

  test('a file from a checkout keeps the dialects its frontmatter extends', async ({ expect }) => {
    const { repo, run } = await setup();
    const content = '---\nid: org.example.launch\nextends:\n  - org.dxos.spec.video\n---\n# Launch\n';
    const created = await run(importSpecFile.handler({ repository: Ref.make(repo), path: 'launch.mdl', content }));
    const spec = await run(Database.load(created.object));
    invariant(Spec.instanceOf(spec), 'Missing spec.');
    expect(spec.dialects).toEqual(['org.dxos.spec.video']);
  });
});
