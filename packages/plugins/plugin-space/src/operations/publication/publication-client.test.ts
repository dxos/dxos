//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Format, Obj, Type } from '@dxos/echo';
import { APIKey } from '@dxos/schema';

import { isSecret, publishableIds, scrubArchive } from './publication-client.ts';

const password = Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password));

class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ text: Schema.String }),
) {}

class Token extends Type.makeObject<Token>(DXN.make('com.example.type.token', '0.1.0'))(
  Schema.Struct({ token: password }),
) {}

describe('scrubArchive', () => {
  test('keeps only the published objects and their data feeds, without provenance', ({ expect }) => {
    const archive = {
      version: 1,
      originalSpaceId: 'S',
      exportedBy: 'K',
      objects: [{ id: 'kept' }, { id: 'dropped' }, { id: 'traced' }, {}],
      feeds: [
        { feedObjectId: 'kept', namespace: 'data', messages: [] },
        { feedObjectId: 'dropped', namespace: 'data', messages: [] },
        { feedObjectId: 'traced', namespace: 'trace', messages: [] },
      ],
    };

    const { text, objects } = scrubArchive(
      new TextEncoder().encode(JSON.stringify(archive)),
      new Set(['kept', 'traced']),
    );
    const scrubbed = JSON.parse(text);
    expect(scrubbed.originalSpaceId).toBeUndefined();
    expect(scrubbed.exportedBy).toBeUndefined();
    expect(objects).toEqual(['kept', 'traced']);
    expect(scrubbed.feeds.map((feed: { feedObjectId: string }) => feed.feedObjectId)).toEqual(['kept']);
  });
});

describe('publishableIds', () => {
  test('publishes objects of a known type with no password field, and nothing of an unknown type', async ({
    expect,
  }) => {
    const note = Obj.make(Note, { text: 'hello' });
    const token = Obj.make(Token, { token: 'secret' });
    const unknown = await Obj.fromJSON({
      'id': '01M7NXDFVHKF23RS5XARV4G6A6',
      '@type': 'dxn:com.example.type.missing:0.1.0',
      '@meta': { keys: [] },
      'token': 'secret',
    });
    expect(Obj.getType(unknown)).toBeUndefined();
    expect(publishableIds([note, token, unknown])).toEqual(new Set([note.id]));
  });
});

describe('isSecret', () => {
  test('a schema with a password field anywhere in it is a secret', ({ expect }) => {
    expect(isSecret(Schema.Struct({ token: password }))).toBe(true);
    expect(isSecret(Schema.Struct({ keys: Schema.Array(APIKey) }))).toBe(true);
    expect(isSecret(Schema.Struct({ name: Schema.String }))).toBe(false);
  });

  test('a recursive schema is walked once', ({ expect }) => {
    interface Tree {
      readonly children: readonly Tree[];
    }
    const Tree: Schema.Codec<Tree> = Schema.Struct({
      children: Schema.Array(Schema.suspend((): Schema.Codec<Tree> => Tree)),
    });
    expect(isSecret(Tree)).toBe(false);
  });
});
