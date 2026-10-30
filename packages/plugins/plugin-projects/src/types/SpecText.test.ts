//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';
import { SpecDocument } from '@dxos/types';

import * as Feature from './Feature.ts';
import * as FeatureEmbed from './FeatureEmbed.ts';
import * as FeatureSpec from './FeatureSpec.ts';
import * as Spec from './Spec.ts';
import * as SpecText from './SpecText.ts';

describe('SpecText', () => {
  let builder: EchoTestBuilder;
  let db: Database.Database;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Spec.Spec, SpecDocument.SpecDocument, Feature.Feature, Text.Text],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addFeature = (name: string) => db.add(Feature.make({ name, status: 'planned' }));
  const addSpec = (name: string, features: Feature.Feature[] = []) =>
    db.add(Spec.make({ name, features: features.map((feature) => Ref.make(feature)) }));
  const write = async (spec: Spec.Spec, content: string) => {
    const document = await spec.document.load();
    Doc.updateText(await document.content.load(), 'content', content);
  };
  const embedded = async (spec: Spec.Spec) => FeatureEmbed.parse(await SpecText.read(spec)).map(({ id }) => id);
  const members = (spec: Spec.Spec) => spec.features.map((ref) => FeatureEmbed.entityId(ref.uri));

  test('the spec holds what its text embeds, in the order the text gives', async ({ expect }) => {
    const sync = addFeature('Sync');
    const compose = addFeature('Compose');
    const inbox = addSpec('Inbox', [sync, compose]);
    expect(await embedded(inbox)).toEqual([sync.id, compose.id]);

    await write(inbox, `Mail.\n\n${SpecText.makeEmbed(compose)}\n\n${SpecText.makeEmbed(sync)}\n`);
    await SpecText.sync(inbox);
    expect(members(inbox)).toEqual([compose.id, sync.id]);
  });

  test('a feature the spec holds but the text never embedded is embedded, not dropped', async ({ expect }) => {
    const sync = addFeature('Sync');
    const inbox = addSpec('Inbox', [sync]);
    await write(inbox, 'Just prose.');
    const result = await SpecText.sync(inbox);
    expect(result.embedded).toEqual([sync.id]);
    expect(await embedded(inbox)).toEqual([sync.id]);
    expect(members(inbox)).toEqual([sync.id]);
  });

  test('a removed embed deletes its feature, and putting the embed back restores the same one', async ({ expect }) => {
    const sync = addFeature('Sync');
    const inbox = addSpec('Inbox', [sync]);
    const text = await SpecText.read(inbox);
    await write(inbox, 'Just prose.');
    expect((await SpecText.sync(inbox, { removed: [sync.id] })).deleted).toEqual([sync.id]);
    expect(Obj.isDeleted(sync)).toBe(true);
    expect(members(inbox)).toEqual([]);

    await write(inbox, text);
    expect((await SpecText.sync(inbox)).claimed).toEqual([sync.id]);
    expect(Obj.isDeleted(sync)).toBe(false);
    expect(Spec.getContainer(sync)?.id).toBe(inbox.id);
  });

  test('an embed cut from one document and pasted into another moves the feature, whichever syncs first', async ({
    expect,
  }) => {
    const sync = addFeature('Sync');
    const inbox = addSpec('Inbox', [sync]);
    const mail = addSpec('Mail');
    await write(mail, SpecText.makeEmbed(sync));
    await write(inbox, '');

    await SpecText.sync(inbox, { removed: [sync.id] });
    expect(Obj.isDeleted(sync)).toBe(false);
    expect(Spec.getContainer(sync)?.id).toBe(mail.id);
    await SpecText.sync(mail);
    expect(members(mail)).toEqual([sync.id]);
    expect(members(inbox)).toEqual([]);
  });

  test('an embed of a feature its own spec still embeds is a reference and moves nothing', async ({ expect }) => {
    const sync = addFeature('Sync');
    const inbox = addSpec('Inbox', [sync]);
    const mail = addSpec('Mail');
    await write(mail, SpecText.makeEmbed(sync));
    await SpecText.sync(mail);
    expect(Spec.getContainer(sync)?.id).toBe(inbox.id);
    expect(members(mail)).toEqual([]);
  });

  test('expand writes each embed of a held feature as its block, keeping read-in ids and numbering the rest', async ({
    expect,
  }) => {
    const sync = addFeature('Sync');
    Obj.update(sync, (sync) => {
      sync.requirements = [{ id: 'F-1.1', text: 'Mail arrives within a minute.' }];
    });
    Feature.setSources(sync, ['packages/a/PLUGIN.mdl#F-1']);
    const archive = addFeature('Archive');
    const other = addFeature('Elsewhere');
    addSpec('Mail', [other]);
    const inbox = addSpec('Inbox', [sync, archive]);
    await write(
      inbox,
      `# Inbox\n\n${SpecText.makeEmbed(sync)}\n\n${SpecText.makeEmbed(archive)}\n\nSee ${SpecText.makeEmbed(other)}.\n`,
    );
    await SpecText.sync(inbox);

    const text = await SpecText.expand(inbox);
    expect(
      FeatureSpec.parse(text).map(({ id, name, status, requirements }) => ({ id, name, status, requirements })),
    ).toEqual([
      {
        id: 'F-1',
        name: 'Sync',
        status: 'planned',
        requirements: [{ id: 'F-1.1', text: 'Mail arrives within a minute.' }],
      },
      { id: 'F-2', name: 'Archive', status: 'planned', requirements: [] },
    ]);
    expect(text).toContain(`See ${SpecText.makeEmbed(other)}.`);
    expect(text.startsWith('# Inbox\n\n```mdl\nfeat F-1: Sync')).toBe(true);
  });

  test('sync numbers a feature made in the app after the highest block id, and keeps the ids when features move', async ({
    expect,
  }) => {
    const sync = addFeature('Sync');
    Feature.setSources(sync, ['packages/a/PLUGIN.mdl#F-4']);
    const archive = addFeature('Archive');
    Obj.update(archive, (archive) => {
      archive.requirements = [{ text: 'Archived mail is searchable.' }, { id: 'F-5.3', text: 'Undo restores it.' }];
    });
    const inbox = addSpec('Inbox', [sync, archive]);
    await SpecText.sync(inbox);
    expect(Feature.getBlockId(archive)).toBe('F-5');
    expect(archive.requirements?.map(({ id }) => id)).toEqual(['F-5.4', 'F-5.3']);

    await write(inbox, `${SpecText.makeEmbed(archive)}\n\n${SpecText.makeEmbed(sync)}\n`);
    await SpecText.sync(inbox);
    expect([Feature.getBlockId(archive), Feature.getBlockId(sync)]).toEqual(['F-5', 'F-4']);
  });

  test('a feature numbered before its spec had a file is the feature its block names once taken in', async ({
    expect,
  }) => {
    const archive = addFeature('Archive');
    const inbox = addSpec('Inbox', [archive]);
    await SpecText.sync(inbox);
    const file = await SpecText.expand(inbox);
    expect(FeatureSpec.parse(file).map(({ id }) => id)).toEqual(['F-1']);

    const { created } = await SpecText.take(inbox, { path: 'packages/a/PLUGIN.mdl', text: file });
    expect(created).toEqual([]);
    expect(members(inbox)).toEqual([archive.id]);
    expect(Feature.getSources(archive)).toEqual(['packages/a/PLUGIN.mdl#F-1']);
  });

  test('a file taken in and written out against itself is unchanged, apart from what was edited since', async ({
    expect,
  }) => {
    const file = [
      '# Inbox',
      '',
      '```mdl',
      'feat F-1: Sync',
      '',
      '  req F-1.1:',
      '    when: mail arrives',
      '    then: it shows within a minute',
      '```',
      '',
      '```mdl',
      'feat F-2: Compose',
      '  req F-2.1: Drafts are kept.',
      '```',
      '',
    ].join('\n');
    const inbox = addSpec('Inbox');
    const { created } = await SpecText.take(inbox, { path: 'packages/a/PLUGIN.mdl', text: file });
    expect(created).toHaveLength(2);
    expect(FeatureSpec.parse(await SpecText.read(inbox))).toEqual([]);
    expect(await SpecText.expand(inbox, { base: file })).toBe(file);

    const [, compose] = await Ref.loadAll(inbox.features);
    Obj.update(compose, (compose) => {
      compose.status = 'operational';
    });
    expect(await SpecText.expand(inbox, { base: file })).toBe(
      file.replace('feat F-2: Compose\n', 'feat F-2: Compose\n  status: operational\n'),
    );
  });

  test('a block without a status line is taken in as planned, as it is written out', async ({ expect }) => {
    const file = ['```mdl', 'feat F-1: Sync', '  status: operational', '```', ''].join('\n');
    const inbox = addSpec('Inbox');
    await SpecText.take(inbox, { path: 'PLUGIN.mdl', text: file });
    const [sync] = await Ref.loadAll(inbox.features);
    expect(sync.status).toBe('operational');

    const edited = file.replace('  status: operational\n', '');
    await SpecText.take(inbox, { path: 'PLUGIN.mdl', text: edited });
    expect(sync.status).toBe('planned');
    expect(await SpecText.expand(inbox, { base: edited })).toBe(edited);
  });

  test('replaceBlock finds a block that shares its fence with others', async ({ expect }) => {
    const verdict = addFeature('Verdict');
    const map = addSpec('Ride Check', [verdict]);
    await write(
      map,
      ['```mdl', 'type Hour', '  time: string', '', 'feat F-1: Verdict', '', 'feat F-2: Chart', '```', ''].join('\n'),
    );
    await SpecText.replaceBlock(map, verdict, 'F-1');
    const text = await SpecText.read(map);
    expect(FeatureSpec.parse(text).map(({ id }) => id)).toEqual(['F-2']);
    expect(text).toContain('type Hour');
    expect(await embedded(map)).toEqual([verdict.id]);
  });

  test('a fence holding several feat blocks is taken in as an embed per block', async ({ expect }) => {
    const file = [
      '```mdl',
      'feat F-1: Verdict',
      '  desc: The answer first.',
      '  req F-1.1: Covers three hours.',
      '',
      'feat F-2: Chart',
      '  req F-2.1: One column per hour.',
      '```',
      '',
    ].join('\n');
    const map = addSpec('Ride Check');
    await SpecText.take(map, { path: 'SPEC.mdl', text: file });
    const features = await Ref.loadAll(map.features);
    expect(features.map(({ name, description, requirements }) => ({ name, description, requirements }))).toEqual([
      {
        name: 'Verdict',
        description: 'The answer first.',
        requirements: [{ id: 'F-1.1', text: 'Covers three hours.' }],
      },
      { name: 'Chart', description: undefined, requirements: [{ id: 'F-2.1', text: 'One column per hour.' }] },
    ]);
    expect(await embedded(map)).toEqual(features.map(({ id }) => id));
  });

  test('the codec makes a spec of a document no object owns, once its file holds a feat block', async ({ expect }) => {
    const document = db.add(SpecDocument.make({ name: 'a/PLUGIN.mdl', content: '' }));
    const path = 'packages/a/PLUGIN.mdl';
    expect(await SpecText.codec.read(document, 'Just prose.', { path })).toBe(false);
    expect(Obj.getParent(document)).toBeUndefined();
    expect(await SpecText.codec.write(document, {})).toBeUndefined();

    const file = ['# A', '', '```mdl', 'feat F-1: Sync', '```', ''].join('\n');
    expect(await SpecText.codec.read(document, file, { path })).toBe(true);
    const spec = Obj.getParent(document);
    expect(Spec.instanceOf(spec) && spec.name).toBe('a/PLUGIN.mdl');
    expect(Spec.instanceOf(spec) && (await Ref.loadAll(spec.features)).map(({ name }) => name)).toEqual(['Sync']);
    expect(await SpecText.codec.write(document, { base: file })).toBe(file);
  });
});
