//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';
import { SpecDocument } from '@dxos/types';

import { Feature, FeatureEmbed, LegacyFeature, LegacyShowcase, LegacySpec, Showcase, Spec, SpecText } from '#types';

import { featureSources, featureSubfeatures, makeFeatureSpecs, makeSpecOwners } from './migrations.ts';

describe('feature migrations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const open = async () => {
    const { db, graph } = await builder.createDatabase({ types: [Project.Project, Text.Text] });
    graph.registry.add([
      LegacyFeature.Feature,
      LegacyFeature.FeatureV2,
      LegacyFeature.FeatureV3,
      Feature.Feature,
      Spec.Spec,
      SpecDocument.SpecDocument,
    ]);
    return db;
  };

  test('0.1.0 subfeature records become child features and in-progress becomes planned', async ({ expect }) => {
    const db = await open();
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

    const features = await db.query(Filter.type(LegacyFeature.FeatureV2)).run();
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

  test("0.2.0 features move onto their project's spec, and subfeatures onto their parent's own", async ({ expect }) => {
    const db = await open();
    const project = db.add(Project.make({ name: 'Inbox' }));
    const sync = db.add(
      Obj.make(LegacyFeature.FeatureV2, { name: 'Sync', status: 'planned', project: Ref.make(project) }),
    );
    db.add(Obj.make(LegacyFeature.FeatureV2, { name: 'Gmail', status: 'operational', parent: Ref.make(sync) }));
    db.add(
      Obj.make(LegacyFeature.FeatureV2, {
        name: 'Compose',
        status: 'prototype',
        project: Ref.make(project),
        position: { x: 3, y: 4 },
      }),
    );
    db.add(Obj.make(LegacyFeature.FeatureV2, { name: 'Loose', status: 'planned' }));
    await db.flush();
    await db.runMigrations([makeFeatureSpecs()]);

    const features = await db.query(Filter.type(Feature.Feature)).run();
    const byName = (name: string) => features.find((feature) => feature.name === name);
    const specs = await db.query(Filter.type(Spec.Spec)).run();
    expect(specs.map(({ name }) => name).sort()).toEqual(['Features', 'Inbox', 'Sync']);

    const inbox = specs.find(({ name }) => name === 'Inbox');
    expect(inbox && Spec.getProject(inbox)?.id).toBe(project.id);
    expect(project.spec?.peek()?.id).toBe(inbox?.id);
    const compose = byName('Compose');
    expect(inbox?.features.map((ref) => ref.target?.name).sort()).toEqual(['Compose', 'Sync']);
    const embedded = inbox && FeatureEmbed.parse(await SpecText.read(inbox)).map(({ label }) => label);
    expect(embedded?.sort()).toEqual(['Compose', 'Sync']);
    expect(compose && inbox?.layout?.positions[compose.id]).toEqual({ x: 3, y: 4 });

    const nested = byName('Sync')?.spec?.target;
    expect(nested?.features.map((ref) => ref.target?.name)).toEqual(['Gmail']);
    expect(nested && Spec.getOwner(nested)?.name).toBe('Sync');
    const gmail = byName('Gmail');
    expect(gmail && Spec.getContainer(gmail)?.id).toBe(nested?.id);

    const loose = byName('Loose');
    expect(loose && Spec.getContainer(loose)?.name).toBe('Features');
  });

  test('0.3.0 sources become foreign keys, and each feat block in its document becomes an embed', async ({
    expect,
  }) => {
    const db = await open();
    const inbox = db.add(Spec.make({ name: 'Inbox' }));
    const document = await inbox.document.load();
    const text = 'Mail.\n\n```mdl\nfeat F-1: Sync\n  req F-1.1: Mail arrives within a minute.\n```\n\nMore prose.\n';
    Doc.updateText(await document.content.load(), 'content', text);
    const sync = db.add(
      Obj.make(LegacyFeature.FeatureV3, { name: 'Sync', status: 'planned', specs: ['packages/a/PLUGIN.mdl#F-1'] }),
    );
    const archive = db.add(Obj.make(LegacyFeature.FeatureV3, { name: 'Archive', status: 'planned' }));
    Obj.setParent(sync, inbox);
    Obj.setParent(archive, inbox);
    await db.flush();
    await db.runMigrations([featureSources]);

    const features = await db.query(Filter.type(Feature.Feature)).run();
    const byName = (name: string) => features.find((feature) => feature.name === name)!;
    expect(Feature.getSources(byName('Sync'))).toEqual(['packages/a/PLUGIN.mdl#F-1']);
    const content = await SpecText.read(inbox);
    expect(content).toBe(
      `Mail.\n\n${SpecText.makeEmbed(byName('Sync'))}\n\nMore prose.\n\n${SpecText.makeEmbed(byName('Archive'))}\n`,
    );
    expect(FeatureEmbed.parse(content)).toHaveLength(2);
  });

  test('a nested spec left by an earlier run is reused rather than made again', async ({ expect }) => {
    const db = await open();
    const sync = db.add(Obj.make(LegacyFeature.FeatureV2, { name: 'Sync', status: 'planned' }));
    db.add(Obj.make(LegacyFeature.FeatureV2, { name: 'Gmail', status: 'planned', parent: Ref.make(sync) }));
    // What an interrupted run leaves: the nested spec, already the parent's child, with no features yet.
    const earlier = db.add(Spec.make({ name: 'Sync' }));
    Obj.setParent(earlier, sync);
    await db.flush();
    await db.runMigrations([makeFeatureSpecs()]);

    const nested = (await db.query(Filter.type(Spec.Spec, { name: 'Sync' })).run()).map(({ id }) => id);
    expect(nested).toEqual([earlier.id]);
    const features = await db.query(Filter.type(Feature.Feature)).run();
    expect(features.find(({ name }) => name === 'Sync')?.spec?.target?.id).toBe(earlier.id);
    expect(earlier.features.map((ref) => ref.target?.name)).toEqual(['Gmail']);
  });

  test('a 0.1.0 spec naming a project becomes owned by it, unless a feature owns the spec', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Project.Project, Text.Text] });
    graph.registry.add([LegacySpec.Spec, Spec.Spec, Feature.Feature, SpecDocument.SpecDocument]);
    const inbox = db.add(Project.make({ name: 'Inbox' }));
    const mail = db.add(Project.make({ name: 'Mail' }));
    const top = db.add(Obj.make(LegacySpec.Spec, { name: 'Inbox', features: [], project: Ref.make(inbox) }));
    const sync = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    const breakdown = db.add(Obj.make(LegacySpec.Spec, { name: 'Sync', features: [], project: Ref.make(mail) }));
    Obj.setParent(breakdown, sync);
    await db.flush();
    await db.runMigrations([makeSpecOwners()]);

    const specs = await db.query(Filter.type(Spec.Spec)).run();
    const migrated = specs.find(({ id }) => id === top.id);
    expect(migrated && Spec.getProject(migrated)?.id).toBe(inbox.id);
    expect(inbox.spec?.peek()?.id).toBe(migrated?.id);
    expect(Obj.getParent(specs.find(({ id }) => id === breakdown.id)!)?.id).toBe(sync.id);
    expect(mail.spec).toBeUndefined();
  });

  test('a 0.1.0 spec without a document is given one, and one with a document keeps it', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacySpec.Spec, Spec.Spec, Feature.Feature, SpecDocument.SpecDocument]);
    const kept = db.add(SpecDocument.make({ name: 'Inbox' }));
    const inbox = db.add(Obj.make(LegacySpec.Spec, { name: 'Inbox', features: [], document: Ref.make(kept) }));
    const sync = db.add(Obj.make(LegacySpec.Spec, { name: 'Sync', features: [] }));
    await db.flush();
    await db.runMigrations([makeSpecOwners()]);

    const specs = await db.query(Filter.type(Spec.Spec)).run();
    const byId = (id: string) => specs.find((spec) => spec.id === id);
    expect((await byId(inbox.id)?.document.load())?.id).toBe(kept.id);
    const made = await byId(sync.id)?.document.load();
    expect(made && Obj.getParent(made)?.id).toBe(sync.id);
    expect(made && (await made.content.load()).content).toContain('name: Sync');
  });

  test('Demonstrates 0.1.0 edges become 0.2.0 with their endpoints, before the showcase itself migrates', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([Feature.Feature, LegacyShowcase.Showcase, LegacyShowcase.Demonstrates, Showcase.Demonstrates]);
    const feature = db.add(Feature.make({ name: 'Compose', status: 'operational' }));
    const showcase = db.add(
      Obj.make(LegacyShowcase.Showcase, { name: 'Reply', content: Ref.make(Text.make()), artifacts: [] }),
    );
    const edge = db.add(
      Relation.make(LegacyShowcase.Demonstrates, { [Relation.Source]: showcase, [Relation.Target]: feature }),
    );
    await db.flush();

    await db.runMigrations([Showcase.demonstratesMigration]);

    expect(await db.query(Filter.type(LegacyShowcase.Demonstrates)).run()).toHaveLength(0);
    const [migrated] = await db.query(Filter.type(Showcase.Demonstrates)).run();
    expect(migrated.id).toBe(edge.id);
    const shown = await db.query(Query.select(Filter.id(feature.id)).targetOf(Showcase.Demonstrates).source()).run();
    expect(shown.map(({ id }) => id)).toEqual([showcase.id]);
  });
});
