//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Query, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { File, PullRequest, Task } from '@dxos/types';

import * as Feature from './Feature.ts';
import * as Showcase from './Showcase.ts';

describe('Feature', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const open = () =>
    builder.createDatabase({
      types: [
        Feature.Feature,
        Feature.DependsOn,
        Feature.Implements,
        Showcase.Showcase,
        Showcase.Demonstrates,
        Task.Task,
        Text.Text,
        File.File,
        PullRequest.PullRequest,
      ],
    });

  test('subfeatures are records on the feature; spec paths open on GitHub', async ({ expect }) => {
    const { db } = await open();
    const sync = db.add(
      Feature.make({
        name: 'Sync',
        status: 'prototype',
        subfeatures: [
          { name: 'Gmail', status: 'operational' },
          { name: 'IMAP', status: 'planned' },
        ],
      }),
    );
    await db.flush();
    expect(sync.subfeatures?.map(({ name }) => name)).toEqual(['Gmail', 'IMAP']);
    expect(await db.query(Filter.type(Feature.Feature)).run()).toHaveLength(1);

    expect(Feature.getSpecUrl('packages/plugins/plugin-inbox/PLUGIN.mdl#F-3')).toBe(
      'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-inbox/PLUGIN.mdl',
    );
    expect(Feature.getSpecUrl('https://example.com/spec.md')).toBe('https://example.com/spec.md');
  });

  test('dependencies, implementing tasks and showcases are relations', async ({ expect }) => {
    const { db } = await open();
    const compose = db.add(Feature.make({ name: 'Compose & send', status: 'prototype' }));
    const tokens = db.add(Feature.make({ name: 'OAuth tokens', status: 'operational' }));
    const task = db.add(Task.make({ title: 'Send through Gmail' }));
    db.add(Feature.makeDependsOn({ [Relation.Source]: compose, [Relation.Target]: tokens }));
    db.add(Feature.makeImplements({ [Relation.Source]: task, [Relation.Target]: compose }));
    const showcase = db.add(Showcase.make({ name: 'Sending a reply', content: 'Reply from the inbox.' }));
    db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: compose }));
    db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: task }));
    await db.flush();

    const dependencies = await db.query(Query.select(Filter.id(compose.id)).sourceOf(Feature.DependsOn).target()).run();
    expect(dependencies.map((feature) => feature.id)).toEqual([tokens.id]);

    const tasks = await db.query(Query.select(Filter.id(compose.id)).targetOf(Feature.Implements).source()).run();
    expect(tasks.map((task) => task.id)).toEqual([task.id]);

    const showcases = await db.query(Query.select(Filter.id(task.id)).targetOf(Showcase.Demonstrates).source()).run();
    expect(showcases.map((showcase) => showcase.id)).toEqual([showcase.id]);
    expect((await showcase.content.load()).content).toBe('Reply from the inbox.');
  });

  test('an edge that would close a cycle is found with its path', async ({ expect }) => {
    const edges = [
      ['a', 'b'],
      ['b', 'c'],
    ] as const;
    expect(Feature.findDependencyCycle(edges, 'c', 'a')).toEqual(['a', 'b', 'c']);
    expect(Feature.findDependencyCycle(edges, 'a', 'c')).toBeUndefined();
    expect(Feature.findDependencyCycle(edges, 'a', 'a')).toEqual(['a']);
  });
});
