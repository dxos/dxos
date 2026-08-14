//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { ProjectSkill } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import { ARTIFACT_SKILL_KEYS } from '../skills/keys';
import { seedProjectScope } from './create-routine';

describe('seedProjectScope', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Collection.Collection, Text.Text],
    });
    return db;
  };

  test('adds ProjectSkill and the artifact-type skills', async ({ expect }) => {
    const db = await setup();
    const instructions = db.add(Instructions.make({ name: 'Routine instructions' }));

    seedProjectScope(instructions);

    const uris = instructions.skills.map((ref) => ref.uri.toString());
    for (const key of [ProjectSkill.key, ...ARTIFACT_SKILL_KEYS]) {
      expect(uris).toContain(Skill.registryURI(key).toString());
    }
  });

  test('is idempotent and preserves scaffold-added skills', async ({ expect }) => {
    const db = await setup();
    const scaffolded = Ref.fromURI(Skill.registryURI('org.dxos.skill.inbox'));
    const instructions = db.add(Instructions.make({ name: 'Routine instructions', skills: [scaffolded] }));

    seedProjectScope(instructions);
    const once = instructions.skills.map((ref) => ref.uri.toString());
    seedProjectScope(instructions);
    const twice = instructions.skills.map((ref) => ref.uri.toString());

    expect(twice).toEqual(once);
    expect(once[0]).toBe(Skill.registryURI('org.dxos.skill.inbox').toString());
    expect(new Set(once).size).toBe(once.length);
  });
});
