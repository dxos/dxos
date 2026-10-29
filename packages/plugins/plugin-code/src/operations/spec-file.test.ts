//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';
import { Repo, SpecDocument } from '@dxos/types';

import exportSpecFile from './export-spec-file.ts';
import importSpecFile from './import-spec-file.ts';
import { loadSpecText } from './spec-file.ts';

const SPEC = ['---', 'id: org.example', '---', '', 'F-1: one', 'F-2: two', 'F-3: three', ''].join('\n');

describe('Spec file mapping (plugin-github spec/FILE-SYNC.mdl F-6)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a remote change merges with a local edit made since the last sync', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Repo.Repo, SpecDocument.SpecDocument, Text.Text]);
    const repo = db.add(Repo.make({ owner: 'dxos', name: 'composer' }));
    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>) =>
      effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

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
});
