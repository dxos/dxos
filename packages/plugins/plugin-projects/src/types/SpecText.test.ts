//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import { type Database, Obj, Ref } from '@dxos/echo';
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

    const [, compose] = await Ref.loadAll(FeatureMap.getFeatures(inbox));
    Obj.update(compose, (compose) => {
      compose.status = 'operational';
    });
    expect(await SpecText.expand(inbox, { base: file })).toBe(
      file.replace('feat F-2: Compose\n', 'feat F-2: Compose\n  status: operational\n'),
    );
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
    const features = await Ref.loadAll(FeatureMap.getFeatures(map));
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

  test('the codec leaves prose to the text merge, and takes a file of feat blocks in and back out', async ({
    expect,
  }) => {
    const spec = addSpec('a/PLUGIN.mdl');
    const path = 'packages/a/PLUGIN.mdl';
    expect(await SpecText.codec.read(spec, 'Just prose.', { path })).toBe(false);
    expect(await SpecText.codec.write(spec, {})).toBeUndefined();

    const file = ['# A', '', '```mdl', 'feat F-1: Sync', '```', ''].join('\n');
    expect(await SpecText.codec.read(spec, file, { path })).toBe(true);
    expect((await Ref.loadAll(FeatureMap.getFeatures(spec))).map(({ name }) => name)).toEqual(['Sync']);
    expect(await SpecText.codec.write(spec, { base: file })).toBe(file);
  });
});
