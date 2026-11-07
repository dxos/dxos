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
import { Text } from '@dxos/schema';
import { Repo } from '@dxos/types';

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
});
