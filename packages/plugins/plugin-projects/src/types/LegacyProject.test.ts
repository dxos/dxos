//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

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
    graph.registry.add([LegacyProject.ProjectV6, Project.Project, Spec.Spec]);
    const spec = db.add(Spec.make({ name: 'Inbox' }));
    const inbox = db.add(
      Obj.make(LegacyProject.ProjectV6, { name: 'Inbox', artifacts: [], routines: [], spec: Ref.make(spec) }),
    );
    const mail = db.add(Obj.make(LegacyProject.ProjectV6, { name: 'Mail', artifacts: [], routines: [] }));
    await db.flush();
    await db.runMigrations([LegacyProject.projectSpecs]);

    const projects = await db.query(Filter.type(Project.Project)).run();
    const byId = (id: string) => projects.find((project) => project.id === id);
    expect(byId(inbox.id)?.specs.map((ref) => ref.peek()?.id)).toEqual([spec.id]);
    expect(byId(mail.id)?.specs).toEqual([]);
  });
});
