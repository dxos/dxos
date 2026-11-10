//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { JsonSchema, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing/index.ts';

const ExternalSpec = Schema.Struct({
  kind: Schema.Literal('external'),
  token: Schema.String.pipe(Schema.optional),
});

const FeedSpec = Schema.Struct({
  kind: Schema.Literal('feed'),
  feed: Schema.String,
});

const Progress = Type.makeObject(DXN.make('com.example.type.progress', '0.1.0'))(
  Schema.Struct({
    max: Schema.String.pipe(Schema.optional),
    lastError: Schema.String.pipe(Schema.optional),
    spec: Schema.Union([ExternalSpec, FeedSpec]),
  }),
);

/**
 * `Progress` as a plugin bundle on EDGE sees it when another bundle publishes it: serialized to JSON Schema, then
 * rebuilt (as `TypeSource.fromRecord` in `@dxos/plugin-host-cloudflare` does). The rebuild declares every optional
 * field with `optionalKey` and wraps each union tag in a one-member union.
 */
const PublishedProgress = Type.makeObject(DXN.make('com.example.type.progress', '0.1.0'))(
  JsonSchema.toEffectSchema(
    Schema.decodeUnknownSync(JsonSchema.JsonSchema)(JSON.parse(JSON.stringify(JsonSchema.toJsonSchema(Progress)))),
  ),
);

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('writes to an object whose type was rebuilt from published JSON Schema', () => {
  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [PublishedProgress] });
    const object = db.add(
      Obj.make(PublishedProgress, { max: '10', lastError: 'boom', spec: { kind: 'external', token: 'a' } }),
    );
    await db.flush();
    return { object };
  };

  test('clears an optional field', async () => {
    const { object } = await setup();

    Obj.update(object, (object) => {
      object.max = '20';
      object.lastError = undefined;
    });

    expect(object.max).toBe('20');
    expect(object.lastError).toBeUndefined();
    expect(Object.keys(Obj.getSnapshot(object))).not.toContain('lastError');
  });

  test('writes and clears a field of a discriminated-union property', async () => {
    const { object } = await setup();

    Obj.update(object, (object) => {
      object.spec.token = 'b';
    });
    expect(object.spec.token).toBe('b');

    Obj.update(object, (object) => {
      object.spec.token = undefined;
    });
    expect(object.spec.token).toBeUndefined();
    expect(object.spec.kind).toBe('external');
  });

  test('rejects a value of the wrong type, naming the field', async () => {
    const { object } = await setup();

    expect(() =>
      Obj.update(object, (object) => {
        object.lastError = 42;
      }),
    ).toThrow('Schema validation failed — lastError: Expected string');
    expect(() =>
      Obj.update(object, (object) => {
        object.spec.token = 42;
      }),
    ).toThrow('Schema validation failed — spec.token: Expected string');
  });

  test('rejects clearing a required field', async () => {
    const { object } = await setup();

    expect(() =>
      Obj.update(object, (object) => {
        object.spec = undefined;
      }),
    ).toThrow(/^Schema validation failed — spec: /);
    expect(object.spec.kind).toBe('external');
  });
});

describe('writes to an object whose type declares an exact optional field', () => {
  test('clears the field', async () => {
    const Note = Type.makeObject(DXN.make('com.example.type.note', '0.1.0'))(
      Schema.Struct({ title: Schema.String, subtitle: Schema.optionalKey(Schema.String) }),
    );
    const { db } = await builder.createDatabase({ types: [Note] });
    const note = db.add(Obj.make(Note, { title: 'Title', subtitle: 'Subtitle' }));

    Obj.update(note, (note) => {
      note.subtitle = undefined;
    });

    expect(note.subtitle).toBeUndefined();
    expect(Object.keys(Obj.getSnapshot(note))).not.toContain('subtitle');
  });
});
