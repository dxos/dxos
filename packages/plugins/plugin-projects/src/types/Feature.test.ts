//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Query, Ref, Relation } from '@dxos/echo';
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

  test('subfeatures are features naming their parent; spec paths open on GitHub', async ({ expect }) => {
    const { db } = await open();
    const sync = db.add(
      Feature.make({
        name: 'Sync',
        status: 'prototype',
        requirements: [{ id: 'F-3.1', text: 'New mail shows within a minute.' }],
      }),
    );
    db.add(Feature.make({ name: 'Gmail', status: 'operational', parent: Ref.make(sync) }));
    db.add(Feature.make({ name: 'IMAP', status: 'planned', parent: Ref.make(sync) }));
    await db.flush();
    const subfeatures = await db.query(Filter.type(Feature.Feature, { parent: Ref.make(sync) })).run();
    expect(subfeatures.map(({ name }) => name).sort()).toEqual(['Gmail', 'IMAP']);
    expect(sync.requirements).toEqual([{ id: 'F-3.1', text: 'New mail shows within a minute.' }]);

    expect(Feature.getSpecUrl('packages/plugins/plugin-inbox/PLUGIN.mdl#F-3')).toBe(
      'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-inbox/PLUGIN.mdl',
    );
    expect(Feature.getSpecUrl('https://example.com/spec.md')).toBe('https://example.com/spec.md');
  });

  test('a plugin spec path names the plugin that bundles it', ({ expect }) => {
    const plugins: Feature.SpecSource[] = [
      {
        key: 'org.dxos.plugin.inbox',
        source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-inbox',
        spec: 'PLUGIN.mdl',
      },
      { key: 'org.dxos.plugin.noSpec', source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-x' },
    ];
    expect(Feature.findSpecPlugin('packages/plugins/plugin-inbox/PLUGIN.mdl#F-3', plugins)).toBe(
      'org.dxos.plugin.inbox',
    );
    expect(Feature.findSpecPlugin('/packages/plugins/plugin-inbox/PLUGIN.mdl', plugins)).toBe('org.dxos.plugin.inbox');
    // Only the bundled file: another spec in the same directory still opens on GitHub.
    expect(Feature.findSpecPlugin('packages/plugins/plugin-inbox/docs/SYNC.mdl', plugins)).toBeUndefined();
    expect(Feature.findSpecPlugin('packages/plugins/plugin-x/PLUGIN.mdl', plugins)).toBeUndefined();
    expect(Feature.findSpecPlugin('https://example.com/PLUGIN.mdl', plugins)).toBeUndefined();
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
