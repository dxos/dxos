//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';

import * as ProjectGraph from '../ProjectGraph.ts';
import { resolveNavigationTarget } from './navigation-target-resolver.ts';

describe('project navigation targets', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a spec resolves to its project', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Project.Project, Spec.Spec, Text.Text] });
    const spec = Spec.make({ name: 'Chess plugin' });
    const project = db.add(Project.make({ name: 'Chess', specs: [Ref.make(spec)] }));
    await db.flush();

    const targets = await EffectEx.runPromise(
      resolveNavigationTarget({ uri: Obj.getURI(spec) }).pipe(Effect.provide(Database.layer(db))),
    );
    expect(targets.map(({ path }) => path)).toEqual([ProjectGraph.getProjectPath(db.spaceId, project.id)]);
  });
});
