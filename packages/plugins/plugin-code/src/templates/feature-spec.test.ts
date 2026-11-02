//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, type Obj, type Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';
import { TaskSet } from '@dxos/types';

import { featureSpec } from './feature-spec.ts';

describe('featureSpec', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('starts a project with the project and feature map skills and no features', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet],
    });
    const project = await EffectEx.runPromise(
      featureSpec
        .scaffold({ name: 'Sheet timeline' })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    expect(project.name).toBe('Sheet timeline');
    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.skills?.map((ref: Ref.Ref<Obj.Unknown>) => ref.uri)).toEqual([
      expect.stringContaining('org.dxos.skill.project'),
      expect.stringContaining('org.dxos.skill.featureMap'),
    ]);
    expect(project.artifacts).toEqual([]);
  });
});
