//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { Feature, LegacyFeature } from '#types';

import { featureSubfeatures } from './migrations.ts';

describe('featureSubfeatures', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('turns subfeature records into child features and in-progress into planned', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Project.Project] });
    graph.registry.add([LegacyFeature.Feature, Feature.Feature]);
    const project = db.add(Project.make({ name: 'Inbox' }));
    const legacy = db.add(
      Obj.make(LegacyFeature.Feature, {
        name: 'Sync',
        status: 'in-progress',
        specs: ['a.mdl#F-1'],
        subfeatures: [
          { name: 'Gmail', status: 'operational' },
          { name: 'IMAP', status: 'in-progress' },
        ],
        project: Ref.make(project),
      }),
    );
    await db.flush();
    await db.runMigrations([featureSubfeatures]);

    const features = await db.query(Filter.type(Feature.Feature)).run();
    const sync = features.find((feature) => feature.id === legacy.id);
    expect(sync).toMatchObject({ name: 'Sync', status: 'planned', specs: ['a.mdl#F-1'], requirements: [] });
    expect(sync?.project?.target?.id).toBe(project.id);
    const children = features.filter((feature) => feature.parent?.target?.id === legacy.id);
    expect(children.map(({ name, status }) => ({ name, status })).sort((a, b) => a.name.localeCompare(b.name))).toEqual(
      [
        { name: 'Gmail', status: 'operational' },
        { name: 'IMAP', status: 'planned' },
      ],
    );
  });
});
