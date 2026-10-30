//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';

import {
  Feature,
  FeatureEmbed,
  FeatureMap,
  LegacyFeature,
  LegacyShowcase,
  LegacySpec,
  Showcase,
  SpecText,
} from '#types';

import {
  documentRename,
  featureSources,
  featureSubfeatures,
  makeFeatureSpecs,
  makeSpecContent,
  makeSpecOwners,
  projectSpecs,
  specDocuments,
} from './migrations.ts';

/** The names of the features the spec holds, in its order. */
const featureNames = async (spec: Spec.Spec | undefined) =>
  spec ? (await Ref.loadAll(FeatureMap.getFeatures(spec))).map(({ name }) => name) : undefined;

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
    expect(inbox && Project.getOwner(inbox)?.id).toBe(project.id);
    expect(project.specs.map((ref) => ref.peek()?.id)).toEqual([inbox?.id]);
    const compose = byName('Compose');
    expect((await featureNames(inbox))?.sort()).toEqual(['Compose', 'Sync']);
    const embedded = inbox && FeatureEmbed.parse(await SpecText.read(inbox)).map(({ label }) => label);
    expect(embedded?.sort()).toEqual(['Compose', 'Sync']);
    expect(compose && inbox && FeatureMap.getLayout(inbox)?.positions[compose.id]).toEqual({ x: 3, y: 4 });

    const nested = await byName('Sync')?.spec?.load();
    expect(await featureNames(nested)).toEqual(['Gmail']);
    expect(nested && FeatureMap.getOwner(nested)?.name).toBe('Sync');
    const gmail = byName('Gmail');
    expect(gmail && FeatureMap.getContainer(gmail)?.id).toBe(nested?.id);

    const loose = byName('Loose');
    expect(loose && FeatureMap.getContainer(loose)?.name).toBe('Features');
  });

  test('0.3.0 sources become foreign keys, and each feat block in its document becomes an embed', async ({
    expect,
  }) => {
    const db = await open();
    const inbox = db.add(Spec.make({ name: 'Inbox' }));
    const text = 'Mail.\n\n```mdl\nfeat F-1: Sync\n  req F-1.1: Mail arrives within a minute.\n```\n\nMore prose.\n';
    Doc.updateText(await inbox.content.load(), 'content', text);
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
    expect(await featureNames(earlier)).toEqual(['Gmail']);
  });

  test('a 0.6.0 project owning a spec lists it in specs, and one owning none lists none', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacySpec.ProjectV6, Project.Project, Spec.Spec]);
    const spec = db.add(Spec.make({ name: 'Inbox' }));
    const inbox = db.add(
      Obj.make(LegacySpec.ProjectV6, { name: 'Inbox', artifacts: [], routines: [], spec: Ref.make(spec) }),
    );
    const mail = db.add(Obj.make(LegacySpec.ProjectV6, { name: 'Mail', artifacts: [], routines: [] }));
    await db.flush();
    await db.runMigrations([projectSpecs]);

    const projects = await db.query(Filter.type(Project.Project)).run();
    const byId = (id: string) => projects.find((project) => project.id === id);
    expect(byId(inbox.id)?.specs.map((ref) => ref.peek()?.id)).toEqual([spec.id]);
    expect(byId(mail.id)?.specs).toEqual([]);
  });

  test('a 0.1.0 spec naming a project becomes owned by it, unless a feature owns the spec', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Project.Project, Text.Text] });
    graph.registry.add([LegacySpec.Spec, LegacySpec.SpecV2, LegacySpec.Document, Feature.Feature]);
    const inbox = db.add(Project.make({ name: 'Inbox' }));
    const mail = db.add(Project.make({ name: 'Mail' }));
    const top = db.add(Obj.make(LegacySpec.Spec, { name: 'Inbox', features: [], project: Ref.make(inbox) }));
    const sync = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    const breakdown = db.add(Obj.make(LegacySpec.Spec, { name: 'Sync', features: [], project: Ref.make(mail) }));
    Obj.setParent(breakdown, sync);
    await db.flush();
    await db.runMigrations([makeSpecOwners()]);

    const specs = await db.query(Filter.type(LegacySpec.SpecV2)).run();
    const migrated = specs.find(({ id }) => id === top.id);
    expect(migrated && Obj.getParent(migrated)?.id).toBe(inbox.id);
    expect(inbox.specs.map((ref) => ref.uri)).toEqual([migrated && Obj.getURI(migrated)]);
    expect(Obj.getParent(specs.find(({ id }) => id === breakdown.id)!)?.id).toBe(sync.id);
    expect(mail.specs).toEqual([]);
  });

  test('a 0.1.0 spec without a document is given one, and one with a document keeps it', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacySpec.Spec, LegacySpec.SpecV2, LegacySpec.Document, Feature.Feature]);
    const kept = db.add(LegacySpec.makeDocument('Inbox'));
    const inbox = db.add(Obj.make(LegacySpec.Spec, { name: 'Inbox', features: [], document: Ref.make(kept) }));
    const sync = db.add(Obj.make(LegacySpec.Spec, { name: 'Sync', features: [] }));
    await db.flush();
    await db.runMigrations([makeSpecOwners()]);

    const specs = await db.query(Filter.type(LegacySpec.SpecV2)).run();
    const byId = (id: string) => specs.find((spec) => spec.id === id);
    expect((await byId(inbox.id)?.document.load())?.id).toBe(kept.id);
    const made = await byId(sync.id)?.document.load();
    expect(made && Obj.getParent(made)?.id).toBe(sync.id);
    expect(made && (await made.content.load()).content).toContain('name: Sync');
  });

  test("a 0.2.0 spec takes its document's text, keys, features and layout, and the document is deleted", async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacySpec.SpecV2, LegacySpec.Document, Spec.Spec, Feature.Feature]);
    const document = db.add(LegacySpec.makeDocument('Inbox'));
    Obj.update(document, (document) => {
      Obj.getMeta(document).keys.push({ source: Feature.SPEC_KEY_SOURCE, id: 'packages/a/PLUGIN.mdl' });
    });
    const text = await document.content.load();
    const sync = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    const legacy = db.add(
      Obj.make(LegacySpec.SpecV2, {
        name: 'Inbox',
        features: [Ref.make(sync)],
        layout: { positions: { [sync.id]: { x: 1, y: 2 } } },
        document: Ref.make(document),
      }),
    );
    Obj.setParent(document, legacy);
    Obj.setParent(sync, legacy);
    await db.flush();
    await db.runMigrations([makeSpecContent()]);

    const [spec] = await db.query(Filter.type(Spec.Spec)).run();
    expect(spec).toMatchObject({ id: legacy.id, name: 'Inbox', dialects: [...FeatureMap.SOFTWARE_DIALECTS] });
    expect((await spec.content.load()).id).toBe(text.id);
    expect(Obj.getParent(text)?.id).toBe(spec.id);
    expect(Obj.getMeta(spec).keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: 'packages/a/PLUGIN.mdl' }]);
    expect(await featureNames(spec)).toEqual(['Sync']);
    expect(FeatureMap.getLayout(spec)?.positions[sync.id]).toEqual({ x: 1, y: 2 });
    expect(await db.query(Filter.type(LegacySpec.Document)).run()).toEqual([]);
  });

  test('a spec document no spec held, under either typename, becomes a spec of its own', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacySpec.PreRenameDocument, LegacySpec.Document, Spec.Spec]);
    const renamed = db.add(
      Obj.make(LegacySpec.PreRenameDocument, { name: 'a/PLUGIN.mdl', content: Ref.make(Text.make({ content: 'A' })) }),
    );
    const current = db.add(LegacySpec.makeDocument('b/PLUGIN.mdl'));
    await db.flush();
    await db.runMigrations([documentRename, specDocuments]);

    const specs = await db.query(Filter.type(Spec.Spec)).run();
    expect(specs.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { id: renamed.id, name: 'a/PLUGIN.mdl' },
      { id: current.id, name: 'b/PLUGIN.mdl' },
    ]);
    expect(await SpecText.read(specs.find(({ id }) => id === renamed.id)!)).toBe('A');
  });

  test('one pass takes a 0.6.0 project and its 0.1.0 spec to the current versions', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([
      LegacySpec.ProjectV6,
      LegacySpec.Spec,
      LegacySpec.SpecV2,
      LegacySpec.Document,
      Project.Project,
      Spec.Spec,
      Feature.Feature,
    ]);
    const project = db.add(Obj.make(LegacySpec.ProjectV6, { name: 'Inbox', artifacts: [], routines: [] }));
    const sync = db.add(Feature.make({ name: 'Sync', status: 'planned' }));
    const legacy = db.add(
      Obj.make(LegacySpec.Spec, {
        name: 'Inbox',
        features: [Ref.make(sync)],
        project: Ref.fromURI(Obj.getURI(project)),
      }),
    );
    Obj.setParent(sync, legacy);
    await db.flush();
    await db.runMigrations([projectSpecs, makeSpecOwners(), makeSpecContent()]);

    const [migrated] = await db.query(Filter.type(Project.Project)).run();
    const [spec] = await db.query(Filter.type(Spec.Spec)).run();
    expect(spec.id).toBe(legacy.id);
    expect(Project.getOwner(spec)?.id).toBe(migrated.id);
    expect(migrated.specs.map((ref) => ref.peek()?.id)).toEqual([spec.id]);
    expect(await featureNames(spec)).toEqual(['Sync']);
    expect(await SpecText.read(spec)).toContain('name: Inbox');
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
