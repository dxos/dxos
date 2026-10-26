//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';

import { EchoTestBuilder } from '../testing/index.ts';
import { getObjectCore } from './echo-object-utils.ts';

const RawRecord = Schema.Record(Schema.String, Schema.Any).pipe(Annotation.RawStringAnnotation.set(true));

class Synced extends Type.makeObject<Synced>(DXN.make('com.example.type.synced', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(Schema.optional),
    snapshots: RawRecord.pipe(Schema.optional),
    spec: Schema.Struct({ note: Schema.String, cache: RawRecord.pipe(Schema.optional) }).pipe(Schema.optional),
  }),
) {}

const BODY = 'x'.repeat(300);

const isRawAt = (obj: Synced, path: string[]) =>
  getObjectCore(obj).getRaw([DATA_NAMESPACE, ...path]) instanceof A.ImmutableString;

describe('RawStringAnnotation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const makeSynced = async (props: Obj.MakeProps<typeof Synced> = {}) => {
    const { db } = await builder.createDatabase({ types: [Synced] });
    return db.add(Obj.make(Synced, props));
  };

  test('a keyed write under an annotated record stores raw strings and reads back strings', async ({ expect }) => {
    const obj = await makeSynced({ snapshots: {} });
    Obj.update(obj, (obj) => {
      if (obj.snapshots) {
        obj.snapshots['issue-1'] = { title: 'Issue 1', description: BODY, labels: ['bug'] };
      }
    });

    expect(isRawAt(obj, ['snapshots', 'issue-1', 'description'])).toBe(true);
    expect(isRawAt(obj, ['snapshots', 'issue-1', 'labels', '0'])).toBe(true);
    expect(obj.snapshots?.['issue-1']).toEqual({ title: 'Issue 1', description: BODY, labels: ['bug'] });
    expect(typeof obj.snapshots?.['issue-1'].description).toBe('string');
    // One op per field instead of one per character.
    expect(Obj.getChanges(obj).at(-1)?.ops ?? Infinity).toBeLessThan(20);
  });

  test('initial values and whole-parent writes are stored raw; unannotated fields stay text', async ({ expect }) => {
    const obj = await makeSynced({ title: 'plain', snapshots: { 'issue-1': { description: BODY } } });
    expect(isRawAt(obj, ['snapshots', 'issue-1', 'description'])).toBe(true);
    expect(isRawAt(obj, ['title'])).toBe(false);

    Obj.update(obj, (obj) => {
      obj.spec = { note: 'text', cache: { key: BODY } };
    });
    expect(isRawAt(obj, ['spec', 'cache', 'key'])).toBe(true);
    expect(isRawAt(obj, ['spec', 'note'])).toBe(false);
    expect(obj.spec).toEqual({ note: 'text', cache: { key: BODY } });
  });
});
