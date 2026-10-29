//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Repo } from '@dxos/types';

import { LegacyRepository } from '#types';

import { repositoryToRepo } from './migrations.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('repository -> repo migration', () => {
  test('converts in place, carrying the object id over as the EDGE key', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([LegacyRepository.Repository, Repo.Repo]);
    const legacy = db.add(
      Obj.make(LegacyRepository.Repository, { name: 'scratch', description: 'Work', defaultBranch: 'main' }),
    );
    const legacyId = legacy.id;
    await db.flush();

    await db.runMigrations([repositoryToRepo]);

    expect(await db.query(Filter.type(LegacyRepository.Repository)).run()).toHaveLength(0);
    const [repo] = await db.query(Filter.type(Repo.Repo)).run();
    expect(repo.id).toBe(legacyId);
    expect(Repo.edgeId(repo)).toBe(legacyId);
    expect(repo).toMatchObject({ name: 'scratch', owner: db.spaceId, description: 'Work', defaultBranch: 'main' });
  });

  test('gives an unnamed repository an empty name', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([LegacyRepository.Repository, Repo.Repo]);
    db.add(Obj.make(LegacyRepository.Repository, {}));
    await db.flush();

    await db.runMigrations([repositoryToRepo]);

    const [repo] = await db.query(Filter.type(Repo.Repo)).run();
    expect(repo.name).toBe('');
  });
});
