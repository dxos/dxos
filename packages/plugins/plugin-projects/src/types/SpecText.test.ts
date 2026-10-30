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
