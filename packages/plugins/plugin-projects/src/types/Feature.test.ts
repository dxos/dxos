//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { File, PullRequest, Task } from '@dxos/types';

import * as Feature from './Feature.ts';
import * as FeatureMap from './FeatureMap.ts';
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
        FeatureMap.FeatureMap,
        Showcase.Showcase,
        Showcase.Showcases,
        Task.Task,
        Text.Text,
        File.File,
        PullRequest.PullRequest,
      ],
    });

  test('subfeatures are owned and deleted with their parent', async ({ expect }) => {
    const { db } = await open();
    const sync = db.add(Feature.make({ name: 'Sync', status: 'operational' }));
    const draft = Feature.make({ name: 'Drafts', status: 'planned' });
    Obj.update(sync, (sync) => {
      sync.subfeatures?.push(Ref.make(draft));
    });
    await db.flush();

    expect(await db.query(Filter.childOf(sync)).run()).toHaveLength(1);
    db.remove(sync);
    await db.flush();
    expect(await db.query(Filter.type(Feature.Feature)).run()).toHaveLength(0);
  });

  test('dependencies, implementing tasks and showcases are relations', async ({ expect }) => {
    const { db } = await open();
    const compose = db.add(Feature.make({ name: 'Compose & send', status: 'prototype' }));
    const tokens = db.add(Feature.make({ name: 'OAuth tokens', status: 'operational' }));
    const task = db.add(Task.make({ title: 'Send through Gmail' }));
    db.add(Feature.makeDependsOn({ [Relation.Source]: compose, [Relation.Target]: tokens }));
    db.add(Feature.makeImplements({ [Relation.Source]: task, [Relation.Target]: compose }));
    const showcase = db.add(Showcase.make({ name: 'Sending a reply', content: 'Reply from the inbox.' }));
    db.add(Showcase.makeShowcases({ [Relation.Source]: showcase, [Relation.Target]: compose }));
    db.add(Showcase.makeShowcases({ [Relation.Source]: showcase, [Relation.Target]: task }));
    db.add(FeatureMap.make({ name: 'Inbox', features: [Ref.make(compose), Ref.make(tokens)] }));
    await db.flush();

    const dependencies = await db.query(Query.select(Filter.id(compose.id)).sourceOf(Feature.DependsOn).target()).run();
    expect(dependencies.map((feature) => feature.id)).toEqual([tokens.id]);

    const tasks = await db.query(Query.select(Filter.id(compose.id)).targetOf(Feature.Implements).source()).run();
    expect(tasks.map((task) => task.id)).toEqual([task.id]);

    const showcases = await db.query(Query.select(Filter.id(task.id)).targetOf(Showcase.Showcases).source()).run();
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
