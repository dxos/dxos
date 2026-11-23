//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Ref } from '@dxos/echo';
import { fromCursor, toCursor } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
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

  test("a 0.3.0 spec that used the features dialect lists the software dialect in place of the package's", async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacyProject.SpecV3, Spec.Spec]);
    const content = () => Ref.make(Text.make({ content: '' }));
    const make = (name: string, dialects: string[]) =>
      db.add(Obj.make(LegacyProject.SpecV3, { name, dialects, content: content() }));
    const software = make('Inbox', [
      'org.dxos.spec.review',
      'org.dxos.spec.features',
      'org.dxos.spec.app',
      'org.dxos.spec.plugin',
      'org.dxos.spec.qa',
      'org.dxos.spec.sql',
      'org.dxos.spec.video',
    ]);
    const tests = make('Checks', ['org.dxos.spec.qa']);
    const plain = make('Notes', []);
    await db.flush();
    await db.runMigrations([LegacyProject.specSoftwareDialect]);

    const specs = new Map((await db.query(Filter.type(Spec.Spec)).run()).map((spec) => [spec.id, spec.dialects]));
    expect(specs.get(software.id)).toEqual(['org.dxos.spec.review', 'org.dxos.spec.software', 'org.dxos.spec.video']);
    expect(specs.get(tests.id)).toEqual(['org.dxos.spec.qa']);
    expect(specs.get(plain.id)).toEqual([]);
  });

  test('a 0.3.0 spec whose text holds front matter takes it into its fields, and the text keeps what follows', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacyProject.SpecV3, Spec.Spec]);
    const make = (name: string, dialects: string[], content: string) =>
      db.add(Obj.make(LegacyProject.SpecV3, { name, dialects, content: Ref.make(Text.make({ content })) }));
    const imported = make(
      'plugin-video/PLUGIN.mdl',
      [],
      '---\nid: org.dxos.plugin.video\nname: Video\nversion: 0.1.0\nextends: [org.dxos.spec.video]\n---\n\n# Video\n',
    );
    const named = make('Mail', ['org.dxos.spec.qa'], '---\nname: Mail\n---\n# Mail\n');
    await db.flush();
    await db.runMigrations([LegacyProject.specSoftwareDialect]);

    const specs = await db.query(Filter.type(Spec.Spec)).run();
    const fields = async (id: string) => {
      const spec = specs.find((spec) => spec.id === id)!;
      const { key, version } = Obj.getMeta(spec);
      return [spec.name, [...spec.dialects], key, version, (await spec.content.load()).content];
    };
    expect(await fields(imported.id)).toEqual([
      'Video',
      ['org.dxos.spec.video'],
      'org.dxos.plugin.video',
      '0.1.0',
      '# Video\n',
    ]);
    expect(await fields(named.id)).toEqual(['Mail', ['org.dxos.spec.qa'], undefined, undefined, '# Mail\n']);
  });

  test('taking front matter keeps a name set in Composer, takes only unset meta, and keeps anchors in the text', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const file = '---\nid: org.dxos.plugin.video # the plugin\nname: Video\n---\n\n# Video\n';
    const renamed = db.add(Spec.make({ name: 'Launch video', content: file }));
    const named = db.add(Spec.make({ name: 'plugin-video/PLUGIN.mdl', content: file }));
    Obj.update(named, (named) => {
      Obj.getMeta(named).key = 'org.example.kept';
    });
    const text = await renamed.content.load();
    const anchor = toCursor(Doc.createAccessor(text, ['content']), file.indexOf('# Video') + 2);

    await LegacyProject.takeFrontMatter(renamed);
    await LegacyProject.takeFrontMatter(named);

    expect([renamed.name, Obj.getMeta(renamed).key, [...renamed.dialects]]).toEqual([
      'Launch video',
      'org.dxos.plugin.video',
      ['org.dxos.spec.software'],
    ]);
    expect([named.name, Obj.getMeta(named).key]).toEqual(['Video', 'org.example.kept']);
    expect(text.content).toBe('# Video\n');
    expect(fromCursor(Doc.createAccessor(text, ['content']), anchor)).toBe(2);
  });

  test('front matter that does not parse leaves the text, and the spec takes nothing from it', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    for (const file of [
      '---\nid: org.x\nname: Launch: v2\nextends: [org.dxos.spec.video]\n---\nBody\n',
      '---\nname: *Draft* plan\n---\nBody\n',
      '---\n# Launch\n\nSome prose\n---\nBody\n',
    ]) {
      const spec = db.add(Spec.make({ name: 'Launch', content: file }));
      await LegacyProject.takeFrontMatter(spec);
      expect([spec.name, Obj.getMeta(spec).key, [...spec.dialects], (await spec.content.load()).content]).toEqual([
        'Launch',
        undefined,
        [],
        'Body\n',
      ]);
    }
  });

  test('a 0.3.0 spec that listed no dialects and whose front matter used the features dialect takes the software one', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([LegacyProject.SpecV3, Spec.Spec]);
    const content = '---\nextends: [org.dxos.spec.features, org.dxos.spec.plugin, org.dxos.spec.video]\n---\nBody\n';
    const spec = db.add(
      Obj.make(LegacyProject.SpecV3, { name: 'Inbox', dialects: [], content: Ref.make(Text.make({ content })) }),
    );
    await db.flush();
    await db.runMigrations([LegacyProject.specSoftwareDialect]);
    const [migrated] = await db.query(Filter.id(spec.id)).run();
    expect([...(migrated as Spec.Spec).dialects]).toEqual(['org.dxos.spec.software', 'org.dxos.spec.video']);
  });

  test('a spec that lists dialects adds those its front matter names', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(
      Spec.make({
        name: 'Launch',
        dialects: ['org.dxos.spec.qa'],
        content: '---\nextends: [org.dxos.spec.video, org.dxos.spec.video]\n---\nBody\n',
      }),
    );
    await LegacyProject.takeFrontMatter(spec);
    expect([...spec.dialects]).toEqual(['org.dxos.spec.qa', 'org.dxos.spec.video']);
  });

  test('taking front matter adds no dialect the spec already extends', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Spec.Spec, Text.Text] });
    const spec = db.add(
      Spec.make({
        name: 'Launch',
        dialects: ['org.dxos.spec.software'],
        content: '---\nextends: [org.dxos.spec.features, org.dxos.spec.qa, org.dxos.spec.video]\n---\nBody\n',
      }),
    );
    await LegacyProject.takeFrontMatter(spec);
    expect([...spec.dialects]).toEqual(['org.dxos.spec.software', 'org.dxos.spec.video']);
  });
});
