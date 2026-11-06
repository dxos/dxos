//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Repo } from '@dxos/types';

import * as LegacyProject from './LegacyProject.ts';

describe('LegacyProject', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a 0.6.0 project owning a spec lists it in specs, and one owning none lists none', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacyProject.ProjectV6, LegacyProject.ProjectV7, Project.Project, Spec.Spec]);
    const spec = db.add(Spec.make({ name: 'Inbox' }));
    const inbox = db.add(
      Obj.make(LegacyProject.ProjectV6, { name: 'Inbox', artifacts: [], routines: [], spec: Ref.make(spec) }),
    );
    const mail = db.add(Obj.make(LegacyProject.ProjectV6, { name: 'Mail', artifacts: [], routines: [] }));
    await db.flush();
    await db.runMigrations([LegacyProject.projectSpecs, LegacyProject.projectRepositories]);

    const projects = await db.query(Filter.type(Project.Project)).run();
    const byId = (id: string) => projects.find((project) => project.id === id);
    expect(byId(inbox.id)?.specs.map((ref) => ref.peek()?.id)).toEqual([spec.id]);
    expect(byId(mail.id)?.specs).toEqual([]);
  });

  test('a 0.7.0 project lists its repo first and then its repositories, each once, and drops its session', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacyProject.ProjectV7, Project.Project, Spec.Spec, Repo.Repo]);
    const [dxos, edge, fork] = [
      db.add(Repo.make({ owner: 'dxos', name: 'dxos' })),
      db.add(Repo.make({ owner: 'dxos', name: 'edge' })),
      db.add(Repo.make({ owner: 'someone', name: 'edge' })),
    ];
    const coding = db.add(
      Obj.make(LegacyProject.ProjectV7, {
        name: 'Coding',
        artifacts: [],
        routines: [],
        specs: [],
        repo: Ref.make(dxos),
        repositories: [Ref.make(edge), Ref.make(dxos), Ref.make(fork)],
        session: {},
      }),
    );
    const plain = db.add(Obj.make(LegacyProject.ProjectV7, { name: 'Plain', artifacts: [], routines: [], specs: [] }));
    await db.flush();
    await db.runMigrations([LegacyProject.projectRepositories]);

    const projects = await db.query(Filter.type(Project.Project)).run();
    const byId = (id: string) => projects.find((project) => project.id === id);
    const migrated = byId(coding.id);
    expect(migrated && Repo.getRepositories(migrated).map((ref) => ref.peek()?.id)).toEqual([
      dxos.id,
      edge.id,
      fork.id,
    ]);
    expect(migrated && Obj.getSnapshot(migrated)).not.toHaveProperty('session');
    expect(Obj.getMeta(byId(plain.id)!).annotations).not.toHaveProperty(Repo.RepositoriesAnnotation.key);
  });
});
