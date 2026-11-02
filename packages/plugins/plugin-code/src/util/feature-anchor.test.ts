//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Relation } from '@dxos/echo';
import { toCursor } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { AnchoredTo, Thread } from '@dxos/types';

import { Feature } from '#types';

import * as FeatureAnchor from './feature-anchor.ts';

describe('feature-anchor', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Feature.Feature, Thread.Thread, AnchoredTo.AnchoredTo],
    });
    const feature = db.add(
      Feature.make({
        name: 'Mail sync',
        status: 'planned',
        requirements: [{ text: 'New mail shows within a minute.' }, { text: 'Sync resumes after sleep.' }],
      }),
    );
    /** An anchor over `[start, end)` of the string at `path`, as the field editors write it. */
    const anchor = (field: FeatureAnchor.Field, path: Doc.KeyPath, start: number, end: number) => {
      const accessor = Doc.createAccessor(feature, path);
      return AnchoredTo.formatPathAnchor({
        path: FeatureAnchor.getPath(field),
        from: toCursor(accessor, start),
        to: toCursor(accessor, end),
      });
    };
    return { db, feature, anchor };
  };

  test('an anchor into a requirement follows its key when the requirement moves', async ({ expect }) => {
    const { feature, anchor } = await setup();
    Feature.setRequirements(feature, [...(feature.requirements ?? []), { text: 'Sync stops when offline.' }]);
    const [first, second, third] = feature.requirements ?? [];
    const sleep = anchor({ field: 'requirement', key: second.key! }, ['requirements', 1, 'text'], 13, 18);
    expect(FeatureAnchor.getText(feature, sleep)).toBe('after');

    // Moving the third to the front leaves the other two in order, so they keep their records.
    Feature.setRequirements(feature, [third, first, second]);
    expect(FeatureAnchor.resolve(feature, sleep)?.path).toEqual(['requirements', 2, 'text']);
    expect(FeatureAnchor.getText(feature, sleep)).toBe('after');
  });

  test('anchors order as the feature reads: whole feature, name, description, then requirements', async ({
    expect,
  }) => {
    const { feature, anchor } = await setup();
    const [first, second] = feature.requirements ?? [];
    // Wrapped, since `Array.sort` puts undefined entries last without comparing them.
    const anchors = [
      anchor({ field: 'requirement', key: second.key! }, ['requirements', 1, 'text'], 0, 4),
      anchor({ field: 'requirement', key: first.key! }, ['requirements', 0, 'text'], 4, 8),
      anchor({ field: 'requirement', key: first.key! }, ['requirements', 0, 'text'], 0, 3),
      anchor({ field: 'name' }, ['name'], 0, 4),
      undefined,
    ].map((value) => ({ value }));
    const sorted = [...anchors].sort((a, b) => FeatureAnchor.compare(feature, a.value, b.value));
    expect(sorted.map(({ value }) => value && FeatureAnchor.getText(feature, value))).toEqual([
      undefined,
      'Mail',
      'New',
      'mail',
      'Sync',
    ]);
  });

  test('removing a requirement detaches the threads anchored into it, and only those', async ({ expect }) => {
    const { db, feature, anchor } = await setup();
    // Plain keys: the list's entries are live, so after the splice the first entry is the second requirement.
    const [first, second] = (feature.requirements ?? []).map(({ key }) => key!);
    const relate = (value: string) =>
      db.add(
        AnchoredTo.make({ [Relation.Source]: db.add(Thread.make({})), [Relation.Target]: feature, anchor: value }),
      );
    const onFirst = relate(anchor({ field: 'requirement', key: first }, ['requirements', 0, 'text'], 0, 3));
    const onSecond = relate(anchor({ field: 'requirement', key: second }, ['requirements', 1, 'text'], 0, 4));
    // Relation queries read the index, which the threads must reach first.
    await db.flush({ indexes: true });

    Obj.update(feature, (feature) => {
      feature.requirements?.splice(0, 1);
    });
    await FeatureAnchor.clearRequirementAnchors(feature, first);
    expect(onFirst.anchor).toBeUndefined();
    expect(FeatureAnchor.getText(feature, onSecond.anchor!)).toBe('Sync');
  });
});
