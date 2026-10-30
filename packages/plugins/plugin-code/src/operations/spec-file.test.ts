//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as Spec from '@dxos/plugin-projects/Spec';
import * as SpecText from '@dxos/plugin-projects/SpecText';
import { Text } from '@dxos/schema';
import { Repo, SpecDocument } from '@dxos/types';

import exportSpecFile from './export-spec-file.ts';
import importSpecFile from './import-spec-file.ts';
import { loadSpecText } from './spec-file.ts';

const SPEC = ['---', 'id: org.example', '---', '', 'F-1: one', 'F-2: two', 'F-3: three', ''].join('\n');

const FEATURES = ['# Mail', '', '```mdl', 'feat F-1: Sync', '```', '', '```mdl', 'feat F-2: Compose', '```', ''].join(
  '\n',
);

const capabilities = () => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  manager.contribute({
    module: 'test',
    interface: ProjectCapabilities.SpecDocumentCodec,
    implementation: SpecText.codec,
  });
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
    graph.registry.add([Repo.Repo, Spec.Spec, SpecDocument.SpecDocument, Feature.Feature, Text.Text]);
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
    expect(Obj.instanceOf(SpecDocument.SpecDocument, spec) && spec.name).toBe('plugin-code/PLUGIN.mdl');
    const { text } = await run(loadSpecText(created.object));
    expect(text.content).toBe(SPEC);

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

    expect(text.content).toBe(SPEC.replace('F-1: one', 'F-1: one, local').replace('F-3: three', 'F-3: three, remote'));
    const exported = await run(exportSpecFile.handler({ object: merged.object, path: 'PLUGIN.mdl' }));
    expect(exported.content).toBe(text.content);
  });

  test('a file of feat blocks becomes a spec of features, and a remote change merges with a local edit', async ({
    expect,
  }) => {
    const { repo, run } = await setup();
    const path = 'packages/plugins/plugin-mail/PLUGIN.mdl';
    const created = await run(importSpecFile.handler({ repository: Ref.make(repo), path, content: FEATURES }));
    const document = await run(Database.load(created.object));
    const spec = Obj.getParent(document);
    invariant(Spec.instanceOf(spec), 'Missing spec.');
    const [sync, compose] = await Ref.loadAll(spec.features);
    expect([sync.name, compose.name]).toEqual(['Sync', 'Compose']);
    expect(await SpecText.read(spec)).not.toContain('feat F-1');

    // A Composer user renames F-1; meanwhile the file's F-2 was renamed on GitHub.
    Obj.update(sync, (sync) => {
      sync.name = 'Sync, local';
    });
    const remote = FEATURES.replace('feat F-2: Compose', 'feat F-2: Compose, remote');
    const merged = await run(
      importSpecFile.handler({
        repository: Ref.make(repo),
        path,
        content: remote,
        base: FEATURES,
        object: created.object,
        heads: created.heads,
      }),
    );

    expect([sync.name, compose.name]).toEqual(['Sync, local', 'Compose, remote']);
    const exported = await run(exportSpecFile.handler({ object: merged.object, path }));
    expect(exported.content).toBe(remote.replace('feat F-1: Sync', 'feat F-1: Sync, local'));
  });

  test('a spec of features is not pushed before its file text is known, so its blocks keep their form', async ({
    expect,
  }) => {
    const { db, run } = await setup();
    const document = db.add(SpecDocument.make({ name: 'plugin-mail/PLUGIN.mdl', content: '' }));
    await SpecText.codec.read(document, FEATURES, { path: 'packages/plugins/plugin-mail/PLUGIN.mdl' });
    const exported = run(exportSpecFile.handler({ object: Ref.make(document), path: 'PLUGIN.mdl' }));
    await expect(exported).rejects.toThrow('No synced file text');
  });
});
