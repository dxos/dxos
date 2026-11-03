//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { getTextInRange, toCursor } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
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
        Spec.Spec,
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
    const inbox = db.add(FeatureMap.make({ name: 'Inbox', features: [sync] }));
    const gmail = db.add(Feature.make({ name: 'Gmail', status: 'operational' }));
    const imap = db.add(Feature.make({ name: 'IMAP', status: 'planned' }));
    const breakdown = db.add(FeatureMap.make({ name: 'Sync', features: [gmail, imap] }));
    Obj.update(sync, (sync) => {
      sync.spec = Ref.make(breakdown);
    });
    await db.flush();
    expect(FeatureMap.getContainer(sync)?.id).toBe(inbox.id);
    expect(FeatureMap.getContainer(gmail)?.id).toBe(breakdown.id);
    expect(FeatureMap.getOwner(breakdown)?.id).toBe(sync.id);
    expect(FeatureMap.isWithin(breakdown, sync)).toBe(true);
    expect(FeatureMap.isWithin(inbox, sync)).toBe(false);
    // Only the top-level spec is a root, which is what the sidebar lists.
    const roots = await db.query(Filter.and(Filter.type(Spec.Spec), Filter.hasParent(false))).run();
    expect(roots.map(({ name }) => name)).toEqual(['Inbox']);
    expect(Feature.getRequirements(sync)).toEqual([
      { key: expect.any(String), id: 'F-3.1', text: 'New mail shows within a minute.' },
    ]);

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

  test('a rewritten requirement list keeps each key, matched by key, else spec id, else text', async ({ expect }) => {
    const { db } = await open();
    const feature = db.add(
      Feature.make({
        name: 'Sync',
        status: 'planned',
        requirements: [{ id: 'F-3.1', text: 'New mail shows within a minute.' }, { text: 'Sync resumes after sleep.' }],
      }),
    );
    const [first, second] = Feature.getRequirements(feature).map(({ key }) => key);
    expect(first).toBeDefined();
    expect(second).not.toBe(first);

    Feature.setRequirements(feature, [
      { text: 'Sync resumes after sleep.' },
      { id: 'F-3.1', text: 'Unread mail shows within a minute.' },
      { text: 'Sync stops when offline.' },
    ]);
    const keys = Feature.getRequirements(feature).map(({ key }) => key);
    expect(keys.slice(0, 2)).toEqual([second, first]);
    expect(keys[2]).not.toBeOneOf([first, second, undefined]);
  });

  test('a requirement edited in place keeps the cursors into it', async ({ expect }) => {
    const { db } = await open();
    const feature = db.add(
      Feature.make({ name: 'Sync', status: 'planned', requirements: [{ text: 'New mail shows within a minute.' }] }),
    );
    const [{ key }] = Feature.getRequirements(feature);
    const accessor = () => Doc.createAccessor(feature, ['requirements', key, 'text']);
    const [from, to] = [toCursor(accessor(), 4), toCursor(accessor(), 8)];

    Feature.setRequirements(feature, [{ key, text: 'All new mail shows within a minute.' }]);
    expect(getTextInRange(accessor(), from, to)).toBe('mail');
  });

  test('requirement keys stay unique: a repeated key, a repeated id, or a position already taken gets another', async ({
    expect,
  }) => {
    const { db } = await open();
    const unique = (feature: Feature.Feature) => {
      const keys = Feature.getRequirements(feature).map(({ key }) => key);
      return keys.length === 2 && new Set(keys).size === keys.length;
    };
    const twice = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    Feature.setRequirements(twice, [
      { key: 'k', text: 'New mail shows within a minute.' },
      { key: 'k', text: 'Sync resumes after sleep.' },
    ]);
    expect(unique(twice)).toBe(true);

    const sameId = db.add(
      Feature.make({
        name: 'Sync',
        status: 'planned',
        requirements: [
          { id: 'F-3.1', text: 'New mail shows within a minute.' },
          { id: 'F-3.1', text: 'Sync resumes after sleep.' },
        ],
      }),
    );
    expect(unique(sameId)).toBe(true);

    const positionTaken = db.add(
      Feature.make({
        name: 'Sync',
        status: 'planned',
        requirements: [{ key: '1', text: 'New mail shows within a minute.' }, { text: 'Sync resumes after sleep.' }],
      }),
    );
    expect(unique(positionTaken)).toBe(true);
  });

  test('a stored list that repeats a key shows that requirement once, and a removal adds no copy', async ({
    expect,
  }) => {
    const { db } = await open();
    const feature = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    // Another writer stored one key twice in the order.
    Obj.update(feature, (feature) => {
      feature.requirements = {
        k0: { text: 'New mail shows within a minute.' },
        k1: { text: 'Sync stops when offline.' },
      };
      feature.requirementOrder = ['k0', 'k0', 'k1'];
    });
    const texts = () => Feature.getRequirements(feature).map(({ text }) => text);
    expect(texts()).toEqual(['New mail shows within a minute.', 'Sync stops when offline.']);
    Feature.setRequirements(
      feature,
      Feature.getRequirements(feature).filter(({ text }) => text !== 'Sync stops when offline.'),
    );
    expect(texts()).toEqual(['New mail shows within a minute.']);
    expect(feature.requirementOrder).toEqual(['k0']);
  });
  test('a key another writer stored is kept as written, with the cursors into its text', async ({ expect }) => {
    const { db } = await open();
    const feature = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    Obj.update(feature, (feature) => {
      feature.requirements = { 'F-1.1': { id: 'F-1.1', text: 'New mail shows within a minute.' } };
      feature.requirementOrder = ['F-1.1'];
    });
    const accessor = () => Doc.createAccessor(feature, ['requirements', 'F-1.1', 'text']);
    const [from, to] = [toCursor(accessor(), 4), toCursor(accessor(), 8)];

    const [stored] = Feature.getRequirements(feature);
    Feature.setRequirements(feature, [
      { ...stored, text: 'All new mail shows within a minute.' },
      { text: 'Sync stops when offline.' },
    ]);
    expect(Feature.getRequirements(feature)[0]).toMatchObject({
      key: 'F-1.1',
      text: 'All new mail shows within a minute.',
    });
    expect(getTextInRange(accessor(), from, to)).toBe('mail');
  });

  test('a requirement stored without a place in the order shows last and survives a write', async ({ expect }) => {
    const { db } = await open();
    const feature = db.add(
      Feature.make({ name: 'Sync', status: 'planned', requirements: [{ text: 'New mail shows within a minute.' }] }),
    );
    // Another writer added a record without ordering it.
    Obj.update(feature, (feature) => {
      feature.requirements!.k9 = { text: 'Sync stops when offline.' };
    });
    const texts = () => Feature.getRequirements(feature).map(({ text }) => text);
    expect(texts()).toEqual(['New mail shows within a minute.', 'Sync stops when offline.']);
    Feature.setRequirements(feature, [...Feature.getRequirements(feature), { text: 'Undo restores it.' }]);
    expect(texts()).toEqual(['New mail shows within a minute.', 'Sync stops when offline.', 'Undo restores it.']);
  });
});
