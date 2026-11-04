//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
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
    /** An anchor over `[start, end)` of the field's string, as the field editors write it. */
    const anchor = (field: FeatureAnchor.Field, start: number, end: number) => {
      const accessor = Doc.createAccessor(feature, FeatureAnchor.getPath(field));
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
    Feature.setRequirements(feature, [...Feature.getRequirements(feature), { text: 'Sync stops when offline.' }]);
    const [first, second, third] = Feature.getRequirements(feature);
    const sleep = anchor({ field: 'requirement', key: second.key }, 13, 18);
    expect(FeatureAnchor.getText(feature, sleep)).toBe('after');

    // Moving the third to the front leaves the other two in order, so they keep their records.
    Feature.setRequirements(feature, [third, first, second]);
    expect(FeatureAnchor.resolve(feature, sleep)?.order).toBe(4);
    expect(FeatureAnchor.getText(feature, sleep)).toBe('after');
  });

  test('an anchor into a requirement keeps its text when a reorder moves that requirement', async ({ expect }) => {
    const { feature, anchor } = await setup();
    Feature.setRequirements(feature, [...Feature.getRequirements(feature), { text: 'Sync stops when offline.' }]);
    const [first, second, third] = Feature.getRequirements(feature);
    const stops = anchor({ field: 'requirement', key: third.key }, 5, 10);

    Feature.setRequirements(feature, [third, first, second]);
    expect(FeatureAnchor.getText(feature, stops)).toBe('stops');
  });

  test('a requirement another writer adds has a key its comments anchor to', async ({ expect }) => {
    const { feature, anchor } = await setup();
    Obj.update(feature, (feature) => {
      if (feature.requirements && feature.requirementOrder) {
        feature.requirements.k2 = { text: 'Sync stops when offline.' };
        feature.requirementOrder.push('k2');
      }
    });
    const [added] = Feature.getRequirements(feature).slice(-1);
    expect(FeatureAnchor.getText(feature, anchor({ field: 'requirement', key: added.key }, 5, 10))).toBe('stops');
  });

  test('anchors order as the feature reads: whole feature, name, description, then requirements', async ({
    expect,
  }) => {
    const { feature, anchor } = await setup();
    const [first, second] = Feature.getRequirements(feature);
    // Wrapped, since `Array.sort` puts undefined entries last without comparing them.
    const anchors = [
      anchor({ field: 'requirement', key: second.key }, 0, 4),
      anchor({ field: 'requirement', key: first.key }, 4, 8),
      anchor({ field: 'requirement', key: first.key }, 0, 3),
      anchor({ field: 'name' }, 0, 4),
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

  test('an anchor into a requirement the list no longer holds resolves to nothing, and the others still resolve', async ({
    expect,
  }) => {
    const { feature, anchor } = await setup();
    const [first, second] = Feature.getRequirements(feature);
    const onFirst = anchor({ field: 'requirement', key: first.key }, 0, 3);
    const onSecond = anchor({ field: 'requirement', key: second.key }, 0, 4);

    Feature.setRequirements(feature, [second]);
    expect(FeatureAnchor.getText(feature, onFirst)).toBeUndefined();
    expect(FeatureAnchor.getText(feature, onSecond)).toBe('Sync');
  });
});
