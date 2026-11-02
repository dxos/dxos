//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { File, PullRequest, SpecDocument, Task } from '@dxos/types';

import * as Feature from './Feature.ts';
import * as Showcase from './Showcase.ts';
import * as Spec from './Spec.ts';

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
        Spec.Spec,
        SpecDocument.SpecDocument,
        Feature.Feature,
        Feature.DependsOn,
        Feature.Implements,
        Markdown.Document,
        Showcase.Demonstrates,
        Task.Task,
        Text.Text,
        File.File,
        PullRequest.PullRequest,
      ],
    });

  test('a spec owns its features, and a feature nests by owning a spec; spec paths open on GitHub', async ({
    expect,
  }) => {
    const { db } = await open();
    const sync = db.add(
      Feature.make({
        name: 'Sync',
        status: 'prototype',
        requirements: [{ id: 'F-3.1', text: 'New mail shows within a minute.' }],
      }),
    );
    const inbox = db.add(Spec.make({ name: 'Inbox', features: [Ref.make(sync)] }));
    const gmail = db.add(Feature.make({ name: 'Gmail', status: 'operational' }));
    const imap = db.add(Feature.make({ name: 'IMAP', status: 'planned' }));
    const breakdown = db.add(Spec.make({ name: 'Sync', features: [Ref.make(gmail), Ref.make(imap)] }));
    Obj.update(sync, (sync) => {
      sync.spec = Ref.make(breakdown);
    });
    await db.flush();
    expect(Spec.getContainer(sync)?.id).toBe(inbox.id);
    expect(Spec.getContainer(gmail)?.id).toBe(breakdown.id);
    expect(Spec.getOwner(breakdown)?.id).toBe(sync.id);
    expect(Spec.isWithin(breakdown, sync)).toBe(true);
    expect(Spec.isWithin(inbox, sync)).toBe(false);
    // Only the top-level spec is a root, which is what the sidebar lists.
    const roots = await db.query(Filter.and(Filter.type(Spec.Spec), Filter.hasParent(false))).run();
    expect(roots.map(({ name }) => name)).toEqual(['Inbox']);
    expect(sync.requirements).toEqual([{ id: 'F-3.1', text: 'New mail shows within a minute.' }]);

    db.remove(sync);
    await db.flush();
    expect((await db.query(Filter.type(Feature.Feature)).run()).map(({ name }) => name)).toEqual([]);

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
    // Any object can be the source; in the app it is a presenter deck, whose type this plugin cannot import.
    const showcase = db.add(Markdown.make({ name: 'Sending a reply', content: 'Reply from the inbox.' }));
    db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: compose }));
    db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: task }));
    await db.flush();

    const dependencies = await db.query(Query.select(Filter.id(compose.id)).sourceOf(Feature.DependsOn).target()).run();
    expect(dependencies.map((feature) => feature.id)).toEqual([tokens.id]);

    const tasks = await db.query(Query.select(Filter.id(compose.id)).targetOf(Feature.Implements).source()).run();
    expect(tasks.map((task) => task.id)).toEqual([task.id]);

    const showcases = await db.query(Query.select(Filter.id(task.id)).targetOf(Showcase.Demonstrates).source()).run();
    expect(showcases.map((showcase) => showcase.id)).toEqual([showcase.id]);
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
