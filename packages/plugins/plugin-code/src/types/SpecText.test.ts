//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import { type Database, Obj } from '@dxos/echo';
import { getTextInRange, toCursor } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';

import * as Feature from './Feature.ts';
import * as FeatureEmbed from './FeatureEmbed.ts';
import * as FeatureMap from './FeatureMap.ts';
import * as FeatureSpec from './FeatureSpec.ts';
import * as SpecText from './SpecText.ts';

describe('SpecText', () => {
  let builder: EchoTestBuilder;
  let db: Database.Database;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Spec.Spec, Feature.Feature, Text.Text],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addFeature = (name: string) => db.add(Feature.make({ name, status: 'planned' }));
  const addSpec = (name: string, features: Feature.Feature[] = []) => db.add(FeatureMap.make({ name, features }));
  const write = async (spec: Spec.Spec, content: string) => {
    Doc.updateText(await spec.content.load(), 'content', content);
  };
  const embedded = async (spec: Spec.Spec) => FeatureEmbed.parse(await SpecText.read(spec)).map(({ id }) => id);
  const members = (spec: Spec.Spec) => FeatureMap.getFeatures(spec).map((ref) => FeatureEmbed.entityId(ref.uri));

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
    expect(FeatureMap.getContainer(sync)?.id).toBe(inbox.id);
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
    expect(FeatureMap.getContainer(sync)?.id).toBe(mail.id);
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
    expect(FeatureMap.getContainer(sync)?.id).toBe(inbox.id);
    expect(members(mail)).toEqual([]);
  });

  test('sync numbers a feature made in the app after the highest block id, and keeps the ids when features move', async ({
    expect,
  }) => {
    const sync = addFeature('Sync');
    Obj.update(sync, (sync) => {
      Feature.setSources(sync, ['packages/a/PLUGIN.mdl#F-4']);
    });
    const archive = addFeature('Archive');
    Feature.setRequirements(archive, [
      { text: 'Archived mail is searchable.' },
      { id: 'F-5.3', text: 'Undo restores it.' },
    ]);
    const inbox = addSpec('Inbox', [sync, archive]);
    await SpecText.sync(inbox);
    expect(Feature.getBlockId(archive)).toBe('F-5');
    expect(Feature.getRequirements(archive).map(({ id }) => id)).toEqual(['F-5.4', 'F-5.3']);

    await write(inbox, `${SpecText.makeEmbed(archive)}\n\n${SpecText.makeEmbed(sync)}\n`);
    await SpecText.sync(inbox);
    expect([Feature.getBlockId(archive), Feature.getBlockId(sync)]).toEqual(['F-5', 'F-4']);
  });

  test('numbering a new requirement keeps the cursors into the others', async ({ expect }) => {
    const archive = addFeature('Archive');
    const inbox = addSpec('Inbox', [archive]);
    await SpecText.sync(inbox);
    Feature.setRequirements(archive, [{ text: 'Archived mail is searchable.' }]);
    await SpecText.sync(inbox);
    const [{ key }] = Feature.getRequirements(archive);
    const accessor = () => Doc.createAccessor(archive, ['requirements', key, 'text']);
    const [from, to] = [toCursor(accessor(), 9), toCursor(accessor(), 13)];

    Feature.setRequirements(archive, [...Feature.getRequirements(archive), { text: 'Undo restores it.' }]);
    await SpecText.sync(inbox);
    expect(Feature.getRequirements(archive).map(({ id }) => id)).toEqual(['F-1.1', 'F-1.2']);
    expect(getTextInRange(accessor(), from, to)).toBe('mail');
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
});
